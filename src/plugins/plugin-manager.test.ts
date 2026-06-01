import { describe, it, expect, vi } from "vitest";
import { PluginManager } from "@/plugins/plugin-manager";
import type { IPlugin, PluginContext } from "@/plugins/plugin.interface";

const ctx = {} as PluginContext;

function makePlugin(id: string, overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id,
    name: `Plugin ${id}`,
    version: "1.0.0",
    author: "test",
    initialize: vi.fn().mockResolvedValue(undefined),
    teardown: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("PluginManager", () => {
  it("registers and initializes a plugin", async () => {
    const manager = new PluginManager();
    const plugin = makePlugin("a");
    await manager.register(plugin, ctx);
    expect(plugin.initialize).toHaveBeenCalledWith(ctx);
    expect(manager.get("a")).toBe(plugin);
    expect(manager.getAll()).toHaveLength(1);
  });

  it("replaces (and tears down) a duplicate id on re-register", async () => {
    const manager = new PluginManager();
    const first = makePlugin("dup");
    const second = makePlugin("dup");
    await manager.register(first, ctx);
    await manager.register(second, ctx);
    expect(first.teardown).toHaveBeenCalled();
    expect(manager.get("dup")).toBe(second);
    expect(manager.getAll()).toHaveLength(1);
  });

  it("does not retain a plugin whose initialize throws", async () => {
    const manager = new PluginManager();
    const bad = makePlugin("bad", {
      initialize: vi.fn().mockRejectedValue(new Error("boom")),
    });
    await manager.register(bad, ctx);
    expect(manager.get("bad")).toBeUndefined();
  });

  it("unregisters and tears down", async () => {
    const manager = new PluginManager();
    const plugin = makePlugin("a");
    await manager.register(plugin, ctx);
    await manager.unregister("a");
    expect(plugin.teardown).toHaveBeenCalled();
    expect(manager.get("a")).toBeUndefined();
  });

  it("tears down all plugins", async () => {
    const manager = new PluginManager();
    const a = makePlugin("a");
    const b = makePlugin("b");
    await manager.register(a, ctx);
    await manager.register(b, ctx);
    await manager.teardownAll();
    expect(a.teardown).toHaveBeenCalled();
    expect(b.teardown).toHaveBeenCalled();
    expect(manager.getAll()).toHaveLength(0);
  });
});
