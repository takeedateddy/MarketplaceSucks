/**
 * @module core/interfaces/analyzer
 *
 * Defines the {@link IAnalyzer} contract for components that derive insights
 * from listing data.
 *
 * Analyzers run heavier computations -- price fairness scoring, scam detection,
 * market trend analysis -- and produce typed output with an associated
 * confidence level. Heavy analyzers can be deferred to a Web Worker.
 *
 * @example
 * ```ts
 * import type { IAnalyzer, AnalyzerConfidence } from "@/core/interfaces/analyzer.interface";
 * import type { Listing } from "@/core/models/listing";
 *
 * interface FairnessResult {
 *   score: number;
 *   percentile: number;
 * }
 *
 * const fairnessAnalyzer: IAnalyzer<Listing, FairnessResult> = {
 *   id: "price-fairness",
 *   displayName: "Price Fairness",
 *   isHeavy: true,
 *   analyze(input) { ... },
 *   analyzeBatch(inputs) { ... },
 *   hasMinimumData(input) { ... },
 *   getConfidence(input) { ... },
 * };
 * ```
 */

/**
 * Confidence level for an analyzer's output.
 *
 * - `"high"` -- enough data and the result is reliable.
 * - `"medium"` -- reasonable data but some uncertainty.
 * - `"low"` -- limited data; treat the result as a rough estimate.
 * - `"insufficient"` -- not enough data to produce a meaningful result.
 */
export type AnalyzerConfidence = "high" | "medium" | "low" | "insufficient";

/**
 * Wrapper around an analyzer's output that pairs the result with a
 * confidence assessment.
 *
 * @typeParam TOutput - The shape of the analysis result.
 *
 * @example
 * ```ts
 * const result: AnalysisResult<{ score: number }> = {
 *   data: { score: 85 },
 *   confidence: "high",
 *   analyzerId: "price-fairness",
 *   timestamp: Date.now(),
 * };
 * ```
 */
export interface AnalysisResult<TOutput> {
  /** The analysis output. `null` when confidence is `"insufficient"`. */
  readonly data: TOutput | null;

  /** How confident the analyzer is in this result. */
  readonly confidence: AnalyzerConfidence;

  /** The {@link IAnalyzer.id} that produced this result. */
  readonly analyzerId: string;

  /** Unix-epoch millisecond timestamp when the analysis was produced. */
  readonly timestamp: number;
}

/**
 * Contract for components that derive insights from listing data.
 *
 * @typeParam TInput  - The input data shape (usually {@link Listing} or an
 *   array thereof).
 * @typeParam TOutput - The shape of the analysis result.
 *
 * @example
 * ```ts
 * const result = await analyzer.analyze(listing);
 * if (result.confidence !== "insufficient") {
 *   console.log(result.data);
 * }
 * ```
 */
export interface IAnalyzer<TInput, TOutput> {
  /**
   * Unique, stable identifier for this analyzer.
   *
   * @example "price-fairness"
   */
  readonly id: string;

  /**
   * Human-readable name shown in the extension UI.
   *
   * @example "Price Fairness"
   */
  readonly displayName: string;

  /**
   * Whether this analyzer performs heavy computation that should be offloaded
   * to a Web Worker.
   *
   * The pipeline scheduler uses this flag to decide where to run the analyzer.
   *
   * @example true
   */
  readonly isHeavy: boolean;

  /**
   * Run the analysis on a single input.
   *
   * @param input - The data to analyze.
   * @returns A promise resolving to the analysis result with confidence.
   *
   * @example
   * ```ts
   * const result = await analyzer.analyze(listing);
   * ```
   */
  analyze(input: TInput): Promise<AnalysisResult<TOutput>>;

  /**
   * Run the analysis on a batch of inputs.
   *
   * Implementations may optimize batch processing (e.g. computing
   * statistical distributions across the whole set). The default
   * expectation is that this returns one result per input, in order.
   *
   * @param inputs - The array of data items to analyze.
   * @returns A promise resolving to one result per input item.
   *
   * @example
   * ```ts
   * const results = await analyzer.analyzeBatch(listings);
   * ```
   */
  analyzeBatch(inputs: readonly TInput[]): Promise<ReadonlyArray<AnalysisResult<TOutput>>>;

  /**
   * Check whether the input has enough data for a meaningful analysis.
   *
   * Call this before {@link analyze} to avoid wasting computation on
   * incomplete listings.
   *
   * @param input - The data to check.
   * @returns `true` if the input contains sufficient data.
   *
   * @example
   * ```ts
   * if (analyzer.hasMinimumData(listing)) {
   *   const result = await analyzer.analyze(listing);
   * }
   * ```
   */
  hasMinimumData(input: TInput): boolean;

  /**
   * Estimate the confidence level for a given input without performing the
   * full analysis.
   *
   * Useful for UI hints (e.g. dimming an analysis badge when confidence
   * would be low).
   *
   * @param input - The data to assess.
   * @returns The estimated confidence level.
   *
   * @example
   * ```ts
   * const confidence = analyzer.getConfidence(listing);
   * if (confidence === "insufficient") {
   *   showTooltip("Not enough data for analysis");
   * }
   * ```
   */
  getConfidence(input: TInput): AnalyzerConfidence;
}
