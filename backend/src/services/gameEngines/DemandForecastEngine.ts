import { BaseGameEngine } from './BaseGameEngine';
import { ActionResult, RoundResult } from '../../types';
import { prisma } from '../../db';

/**
 * Demand Forecast Challenge - Time-Series Forecasting Simulation
 * 
 * PURPOSE:
 * - Teach time-series forecasting methods
 * - Compare accuracy of different forecasting techniques
 * - Demonstrate importance of forecast error metrics
 * - Show how data patterns affect method selection
 * 
 * FORECASTING METHODS:
 * 1. Naive Forecast: F(t+1) = A(t)
 * 2. Moving Average: F(t+1) = avg(last n periods)
 * 3. Weighted Moving Average: F(t+1) = weighted avg
 * 4. Exponential Smoothing: F(t+1) = α×A(t) + (1-α)×F(t)
 * 5. Double Exponential Smoothing (Holt's): Captures trend
 * 6. Linear Regression: Y = a + b×t
 * 
 * ERROR METRICS:
 * - MAD (Mean Absolute Deviation)
 * - MSE (Mean Squared Error)
 * - MAPE (Mean Absolute Percentage Error)
 * - Tracking Signal
 */

interface ForecastingConfig {
  demandPattern: 'stationary' | 'trending' | 'seasonal' | 'random';
  numPeriods: number;
  revealMethod?: boolean; // Show which method to use
}

interface ForecastingGameState {
  sessionId: string;
  participantId: string;
  config: ForecastingConfig;
  historicalDemand: number[];
  currentPeriod: number;
  totalPeriods: number;
  playerForecasts: {
    period: number;
    forecast: number;
    actual: number;
    method: string;
    error: number;
    absoluteError: number;
    percentageError: number;
  }[];
  cumulativeMetrics: {
    mad: number;
    mse: number;
    mape: number;
    trackingSignal: number;
  };
  score: number;
  optimalMethodUsed: boolean;
  isComplete: boolean;
}

export class DemandForecastEngine extends BaseGameEngine {
  private state!: ForecastingGameState;

  constructor(sessionId: string) {
    super(sessionId, 'demand-forecast-challenge');
  }

  async initialize(config: ForecastingConfig): Promise<void> {
    this.log('Initializing Demand Forecast Challenge', config);

    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: this.sessionId },
    });

    if (participants.length === 0) {
      throw new Error('No participant found for session');
    }

    const participant = participants[0];
    const totalPeriods = config.numPeriods || 20;

    // Generate demand pattern based on type
    const historicalDemand = this.generateDemandPattern(config.demandPattern, totalPeriods);

    this.state = {
      sessionId: this.sessionId,
      participantId: participant.id,
      config,
      historicalDemand,
      currentPeriod: 5, // Start forecasting after 5 periods of history
      totalPeriods,
      playerForecasts: [],
      cumulativeMetrics: {
        mad: 0,
        mse: 0,
        mape: 0,
        trackingSignal: 0,
      },
      score: 0,
      optimalMethodUsed: false,
      isComplete: false,
    };

    await this.saveGameState();
    this.isInitialized = true;
    this.log('Demand Forecast Challenge initialized successfully');
  }

  async applyAction(participantId: string, action: any): Promise<ActionResult> {
    this.ensureInitialized();

    const { forecast, method } = action;

    if (this.state.isComplete) {
      return {
        success: false,
        message: 'Simulation already complete',
      };
    }

    if (typeof forecast !== 'number' || forecast < 0) {
      return {
        success: false,
        message: 'Invalid forecast value',
      };
    }

    // Get actual demand for current period
    const actualDemand = this.state.historicalDemand[this.state.currentPeriod];
    
    // Calculate errors
    const error = actualDemand - forecast;
    const absoluteError = Math.abs(error);
    const percentageError = actualDemand !== 0 ? (absoluteError / actualDemand) * 100 : 0;

    // Record forecast
    this.state.playerForecasts.push({
      period: this.state.currentPeriod,
      forecast,
      actual: actualDemand,
      method,
      error,
      absoluteError,
      percentageError,
    });

    // Update cumulative metrics
    this.updateCumulativeMetrics();

    // Calculate score based on accuracy (100 points - MAPE)
    this.state.score = Math.max(0, 100 - this.state.cumulativeMetrics.mape);

    // Check if using optimal method
    const optimalMethod = this.getOptimalMethod();
    if (method === optimalMethod) {
      this.state.optimalMethodUsed = true;
    }

    // Move to next period
    this.state.currentPeriod++;

    // Check if complete
    if (this.state.currentPeriod >= this.state.totalPeriods) {
      this.state.isComplete = true;
    }

    await this.saveGameState();

    return {
      success: true,
      message: `Forecast recorded for period ${this.state.currentPeriod - 1}`,
      data: {
        actual: actualDemand,
        forecast,
        error,
        absoluteError,
        percentageError: percentageError.toFixed(2) + '%',
        cumulativeMetrics: this.state.cumulativeMetrics,
        score: this.state.score.toFixed(2),
        isComplete: this.state.isComplete,
        optimalMethod: this.state.config.revealMethod ? optimalMethod : undefined,
      },
    };
  }

  async advanceRound(): Promise<RoundResult> {
    // Not applicable for this simulation (player-paced)
    return {
      success: true,
      message: 'Player-paced simulation',
      roundNumber: this.state.currentPeriod,
      isComplete: this.state.isComplete,
    };
  }

  async computeMetrics(): Promise<any> {
    this.ensureInitialized();

    const benchmarkForecasts = this.calculateBenchmarkForecasts();

    return {
      playerPerformance: {
        mad: this.state.cumulativeMetrics.mad.toFixed(2),
        mse: this.state.cumulativeMetrics.mse.toFixed(2),
        mape: this.state.cumulativeMetrics.mape.toFixed(2) + '%',
        trackingSignal: this.state.cumulativeMetrics.trackingSignal.toFixed(2),
        score: this.state.score.toFixed(2),
      },
      benchmarkComparison: benchmarkForecasts,
      dataPattern: this.state.config.demandPattern,
      optimalMethod: this.getOptimalMethod(),
      methodsUsed: this.getMethodDistribution(),
    };
  }

  getPublicState(): any {
    if (!this.isInitialized) return null;

    // Historical data visible to player
    const visibleHistory = this.state.historicalDemand.slice(0, this.state.currentPeriod);

    return {
      currentPeriod: this.state.currentPeriod,
      totalPeriods: this.state.totalPeriods,
      historicalDemand: visibleHistory,
      forecastsCount: this.state.playerForecasts.length,
      cumulativeMetrics: this.state.cumulativeMetrics,
      score: this.state.score,
      isComplete: this.state.isComplete,
      demandPattern: this.state.config.demandPattern,
    };
  }

  getParticipantState(participantId: string): any {
    if (!this.isInitialized) return null;

    return {
      ...this.getPublicState(),
      playerForecasts: this.state.playerForecasts,
      metrics: this.computeMetrics(),
      fullDemandData: this.state.isComplete ? this.state.historicalDemand : undefined,
    };
  }

  // ===== HELPER METHODS =====

  private generateDemandPattern(pattern: string, periods: number): number[] {
    const demand: number[] = [];
    let baseLevel = 100;

    switch (pattern) {
      case 'stationary':
        // Horizontal demand with random noise
        for (let t = 0; t < periods; t++) {
          demand.push(baseLevel + this.randomNoise(10));
        }
        break;

      case 'trending':
        // Linear upward trend
        for (let t = 0; t < periods; t++) {
          demand.push(baseLevel + t * 3 + this.randomNoise(5));
        }
        break;

      case 'seasonal':
        // Seasonal pattern (quarterly)
        for (let t = 0; t < periods; t++) {
          const seasonalFactor = Math.sin((t * Math.PI) / 6) * 20;
          demand.push(baseLevel + seasonalFactor + this.randomNoise(5));
        }
        break;

      case 'random':
        // Pure white noise
        for (let t = 0; t < periods; t++) {
          demand.push(baseLevel + this.randomNoise(30));
        }
        break;

      default:
        // Default to stationary
        for (let t = 0; t < periods; t++) {
          demand.push(baseLevel + this.randomNoise(10));
        }
    }

    return demand.map(d => Math.max(0, Math.round(d)));
  }

  private randomNoise(amplitude: number): number {
    return (Math.random() - 0.5) * 2 * amplitude;
  }

  private updateCumulativeMetrics(): void {
    const n = this.state.playerForecasts.length;
    if (n === 0) return;

    // MAD (Mean Absolute Deviation)
    const sumAbsoluteErrors = this.state.playerForecasts.reduce((sum, f) => sum + f.absoluteError, 0);
    this.state.cumulativeMetrics.mad = sumAbsoluteErrors / n;

    // MSE (Mean Squared Error)
    const sumSquaredErrors = this.state.playerForecasts.reduce((sum, f) => sum + Math.pow(f.error, 2), 0);
    this.state.cumulativeMetrics.mse = sumSquaredErrors / n;

    // MAPE (Mean Absolute Percentage Error)
    const sumPercentageErrors = this.state.playerForecasts.reduce((sum, f) => sum + f.percentageError, 0);
    this.state.cumulativeMetrics.mape = sumPercentageErrors / n;

    // Tracking Signal
    const sumErrors = this.state.playerForecasts.reduce((sum, f) => sum + f.error, 0);
    this.state.cumulativeMetrics.trackingSignal = this.state.cumulativeMetrics.mad !== 0
      ? sumErrors / this.state.cumulativeMetrics.mad
      : 0;
  }

  private getOptimalMethod(): string {
    switch (this.state.config.demandPattern) {
      case 'stationary':
        return 'Moving Average';
      case 'trending':
        return 'Double Exponential Smoothing';
      case 'seasonal':
        return 'Seasonal Decomposition';
      case 'random':
        return 'Naive';
      default:
        return 'Exponential Smoothing';
    }
  }

  private getMethodDistribution(): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};
    
    for (const forecast of this.state.playerForecasts) {
      distribution[forecast.method] = (distribution[forecast.method] || 0) + 1;
    }

    return distribution;
  }

  private calculateBenchmarkForecasts(): any {
    // Calculate what each method would have achieved
    const benchmarks: any = {};

    // Naive method
    benchmarks.naive = this.calculateMethodAccuracy('naive');
    
    // Moving Average (n=3)
    benchmarks.movingAverage3 = this.calculateMethodAccuracy('ma', 3);
    
    // Exponential Smoothing (α=0.3)
    benchmarks.exponentialSmoothing = this.calculateMethodAccuracy('es', 0.3);

    return benchmarks;
  }

  private calculateMethodAccuracy(method: string, param?: number): { mape: number; mad: number } {
    const forecasts: number[] = [];
    const actuals: number[] = [];

    for (let t = 5; t < this.state.currentPeriod; t++) {
      let forecast = 0;

      switch (method) {
        case 'naive':
          forecast = this.state.historicalDemand[t - 1];
          break;

        case 'ma':
          const n = param || 3;
          const slice = this.state.historicalDemand.slice(t - n, t);
          forecast = slice.reduce((sum, val) => sum + val, 0) / n;
          break;

        case 'es':
          const alpha = param || 0.3;
          forecast = alpha * this.state.historicalDemand[t - 1] + (1 - alpha) * (forecasts[forecasts.length - 1] || this.state.historicalDemand[t - 1]);
          break;
      }

      forecasts.push(forecast);
      actuals.push(this.state.historicalDemand[t]);
    }

    // Calculate metrics
    let mad = 0, mape = 0;
    for (let i = 0; i < forecasts.length; i++) {
      const absoluteError = Math.abs(actuals[i] - forecasts[i]);
      mad += absoluteError;
      mape += (absoluteError / actuals[i]) * 100;
    }

    mad /= forecasts.length;
    mape /= forecasts.length;

    return { mape: parseFloat(mape.toFixed(2)), mad: parseFloat(mad.toFixed(2)) };
  }

  private async saveGameState(): Promise<void> {
    await prisma.gameState.create({
      data: {
        session_id: this.sessionId,
        round_number: this.state.currentPeriod,
        state_data: this.state as any,
      },
    });
  }
}

