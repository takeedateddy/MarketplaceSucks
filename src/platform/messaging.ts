/**
 * @module platform/messaging
 *
 * Typed wrapper around `browser.runtime` messaging.
 *
 * All messages flowing through the extension follow a standard envelope shape:
 *
 * ```ts
 * { action: "SOME_ACTION", payload: { … } }
 * ```
 *
 * This module provides helpers to send, listen for, and respond to those
 * envelopes with full type safety. It also includes a helper for sending
 * messages to specific tabs (content scripts).
 */

import { browser } from "./browser";
import type { Runtime } from "webextension-polyfill";

// ---------------------------------------------------------------------------
// Core envelope types
// ---------------------------------------------------------------------------

/**
 * A message envelope that every runtime message must conform to.
 *
 * @typeParam A - A string-literal action discriminator.
 * @typeParam P - The payload shape associated with the action.
 */
export interface MessageEnvelope<A extends string = string, P = unknown> {
  /** Discriminator used to route the message to the right handler. */
  action: A;
  /** Arbitrary data associated with the action. */
  payload: P;
}

/**
 * Map from action strings to their payload / response types.
 *
 * Extend this interface via declaration merging to register new message types
 * across the codebase:
 *
 * ```ts
 * declare module "@/platform/messaging" {
 *   interface MessageDefinitions {
 *     APPLY_FILTERS: { payload: FilterSet; response: { ok: boolean } };
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MessageDefinitions {
  // Extended via declaration merging in consumer modules.
}

/** Helper – extract payload type for a registered action. */
export type PayloadOf<A extends keyof MessageDefinitions> =
  MessageDefinitions[A] extends { payload: infer P } ? P : never;

/** Helper – extract response type for a registered action. */
export type ResponseOf<A extends keyof MessageDefinitions> =
  MessageDefinitions[A] extends { response: infer R } ? R : void;

/** A handler function for a single action. */
export type MessageHandler<A extends keyof MessageDefinitions> = (
  payload: PayloadOf<A>,
  sender: Runtime.MessageSender,
) => Promise<ResponseOf<A>> | ResponseOf<A>;

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

/**
 * Send a message to the extension's background / service worker context.
 *
 * @typeParam A - A registered action string.
 * @param action - The action discriminator.
 * @param payload - Data to include in the message.
 * @returns The response returned by the background handler.
 *
 * @example
 * ```ts
 * const result = await sendMessage("APPLY_FILTERS", { minPrice: 50 });
 * ```
 */
export async function sendMessage<A extends keyof MessageDefinitions>(
  action: A,
  payload: PayloadOf<A>,
): Promise<ResponseOf<A>> {
  const envelope: MessageEnvelope<string, PayloadOf<A>> = { action: action as string, payload };
  return browser.runtime.sendMessage(envelope) as Promise<ResponseOf<A>>;
}

/**
 * Send a message to a specific tab's content script(s).
 *
 * @typeParam A - A registered action string.
 * @param tabId - The target tab.
 * @param action - The action discriminator.
 * @param payload - Data to include in the message.
 * @returns The response returned by the content script handler.
 */
export async function sendMessageToTab<A extends keyof MessageDefinitions>(
  tabId: number,
  action: A,
  payload: PayloadOf<A>,
): Promise<ResponseOf<A>> {
  const envelope: MessageEnvelope<string, PayloadOf<A>> = { action: action as string, payload };
  return browser.tabs.sendMessage(tabId, envelope) as Promise<ResponseOf<A>>;
}

// ---------------------------------------------------------------------------
// Receiving
// ---------------------------------------------------------------------------

/**
 * Register a handler for a single action type.
 *
 * Under the hood this adds a `runtime.onMessage` listener that filters by
 * `action` and delegates to `handler`. The handler's return value is sent
 * back to the caller as the response.
 *
 * @typeParam A - A registered action string.
 * @param action - The action to listen for.
 * @param handler - Callback invoked when the action is received.
 * @returns An unsubscribe function that removes the listener.
 *
 * @example
 * ```ts
 * const off = onMessage("APPLY_FILTERS", async (payload) => {
 *   await applyFilters(payload);
 *   return { ok: true };
 * });
 * ```
 */
export function onMessage<A extends keyof MessageDefinitions>(
  action: A,
  handler: MessageHandler<A>,
): () => void {
  const listener = (
    message: unknown,
    sender: Runtime.MessageSender,
  ): Promise<ResponseOf<A>> | undefined => {
    if (!isEnvelope(message) || message.action !== action) {
      return undefined;
    }
    const result = handler(message.payload as PayloadOf<A>, sender);
    // Returning a Promise tells the runtime to keep the message channel open.
    return result instanceof Promise ? result : Promise.resolve(result);
  };

  browser.runtime.onMessage.addListener(listener);

  return () => {
    browser.runtime.onMessage.removeListener(listener);
  };
}

/**
 * Register a catch-all listener that receives **every** message envelope.
 *
 * Useful for logging / debugging. The handler can optionally return a
 * response; if it returns `undefined` the message continues to propagate to
 * other listeners.
 *
 * @param handler - Callback invoked for every incoming message.
 * @returns An unsubscribe function.
 */
export function onAnyMessage(
  handler: (
    envelope: MessageEnvelope,
    sender: Runtime.MessageSender,
  ) => Promise<unknown> | unknown | undefined,
): () => void {
  const listener = (
    message: unknown,
    sender: Runtime.MessageSender,
  ): Promise<unknown> | undefined => {
    if (!isEnvelope(message)) return undefined;
    const result = handler(message, sender);
    if (result instanceof Promise) return result;
    if (result !== undefined) return Promise.resolve(result);
    return undefined;
  };

  browser.runtime.onMessage.addListener(listener);

  return () => {
    browser.runtime.onMessage.removeListener(listener);
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Type-guard that checks whether an unknown value is a valid message envelope.
 *
 * @param value - The value to check.
 * @returns `true` if the value has the expected `{ action, payload }` shape.
 */
export function isEnvelope(value: unknown): value is MessageEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "action" in value &&
    typeof (value as MessageEnvelope).action === "string"
  );
}
