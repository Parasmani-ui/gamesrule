import { BaseGameEngine } from './BaseGameEngine';
import { ActionResult, RoundResult } from '../../types';
import { prisma } from '../../db';

/**
 * Defect Detectives - Quality Control Simulation
 * 
 * PURPOSE:
 * - Teach Statistical Quality Control (SQC) principles
 * - Demonstrate inspection strategies and sampling plans
 * - Show cost trade-offs between inspection and defects
 * - Illustrate Type I and Type II errors in quality decisions
 * 
 * 7 QC TOOLS:
 * 1. Check Sheet - Data collection
 * 2. Histogram - Distribution visualization
 * 3. Pareto Chart - 80/20 rule
 * 4. Fishbone Diagram - Root cause analysis
 * 5. Scatter Plot - Correlation analysis
 * 6. Flowchart - Process mapping
 * 7. Control Chart - Process control
 * 
 * CONTROL CHART FORMULA:
 * UCL = μ + 3σ
 * CL = μ
 * LCL = μ - 3σ
 * 
 * COST STRUCTURE:
 * Total Quality Cost = Prevention + Appraisal + Internal Failure + External Failure
 */

interface DefectData {
  batchId: number;
  shift: 'A' | 'B' | 'C';
  operator: string;
  machine: string;
  defectType: string;
  defectCount: number;
  sampleSize: number;
  timestamp: Date;
}

interface DefectDetectivesConfig {
  numBatches: number;
  initialDefectRate: number; // Percentage (0-100)
  inspectionCostPerUnit: number;
  defectCostPerUnit: number; // Cost of letting defect reach customer
  targetDefectRate: number; // Goal (0-100)
}

interface QCToolResult {
  tool: string;
  applied: boolean;
  insight: string;
  defectReduction: number; // Percentage improvement
}

interface DefectDetectivesGameState {
  sessionId: string;
  participantId: string;
  config: DefectDetectivesConfig;
  currentBatch: number;
  defectData: DefectData[];
  toolsApplied: QCToolResult[];
  currentDefectRate: number;
  inspectionStrategy: '100%' | 'sampling' | 'none';
  sampleSize: number;
  totalCost: number;
  defectsDetected: number;
  defectsPassedToCustomer: number;
  controlChartData: {
    batchId: number;
    defectRate: number;
    ucl: number;
    lcl: number;
    outOfControl: boolean;
  }[];
  isComplete: boolean;
}

export class DefectDetectivesEngine extends BaseGameEngine {
  private state!: DefectDetectivesGameState;

  constructor(sessionId: string) {
    super(sessionId, 'defect-detectives');
  }

  async initialize(config: Partial<DefectDetectivesConfig>): Promise<void> {
    this.log('Initializing Defect Detectives simulation', config);

    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: this.sessionId },
    });

    if (participants.length === 0) {
      throw new Error('No participant found for session');
    }

    const participant = participants[0];

    const defaultConfig: DefectDetectivesConfig = {
      numBatches: config.numBatches || 20,
      initialDefectRate: config.initialDefectRate || 8.0,
      inspectionCostPerUnit: config.inspectionCostPerUnit || 2,
      defectCostPerUnit: config.defectCostPerUnit || 50,
      targetDefectRate: config.targetDefectRate || 2.0,
    };

    // Generate initial defect data
    const defectData = this.generateDefectData(10, defaultConfig.initialDefectRate);

    this.state = {
      sessionId: this.sessionId,
      participantId: participant.id,
      config: defaultConfig,
      currentBatch: 10,
      defectData,
      toolsApplied: [],
      currentDefectRate: defaultConfig.initialDefectRate,
      inspectionStrategy: 'sampling',
      sampleSize: 50,
      totalCost: 0,
      defectsDetected: 0,
      defectsPassedToCustomer: 0,
      controlChartData: [],
      isComplete: false,
    };

    await this.saveGameState();
    this.isInitialized = true;
    this.log('Defect Detectives initialized successfully');
  }

  async applyAction(participantId: string, action: any): Promise<ActionResult> {
    this.ensureInitialized();

    const { actionType, data } = action;

    if (this.state.isComplete) {
      return {
        success: false,
        message: 'Simulation already complete',
      };
    }

    switch (actionType) {
      case 'apply-qc-tool':
        return await this.applyQCTool(data);
      
      case 'set-inspection-strategy':
        return await this.setInspectionStrategy(data);
      
      case 'process-batch':
        return await this.processBatch();
      
      default:
        return {
          success: false,
          message: 'Invalid action type',
        };
    }
  }

  private async applyQCTool(data: any): Promise<ActionResult> {
    const { tool, analysis } = data;

    if (!tool) {
      return {
        success: false,
        message: 'Please specify which QC tool to apply',
      };
    }

    // Check if tool already applied
    if (this.state.toolsApplied.some(t => t.tool === tool)) {
      return {
        success: false,
        message: `${tool} has already been applied`,
      };
    }

    // Apply tool and get results
    const result = this.calculateToolImpact(tool, analysis);
    
    // Reduce defect rate based on tool effectiveness
    this.state.currentDefectRate = Math.max(
      this.state.config.targetDefectRate,
      this.state.currentDefectRate * (1 - result.defectReduction / 100)
    );

    this.state.toolsApplied.push(result);

    await this.saveGameState();

    return {
      success: true,
      message: `${tool} applied successfully`,
      data: {
        tool,
        insight: result.insight,
        defectReduction: result.defectReduction + '%',
        newDefectRate: this.state.currentDefectRate.toFixed(2) + '%',
        toolsAppliedCount: this.state.toolsApplied.length,
      },
    };
  }

  private async setInspectionStrategy(data: any): Promise<ActionResult> {
    const { strategy, sampleSize } = data;

    if (!['100%', 'sampling', 'none'].includes(strategy)) {
      return {
        success: false,
        message: 'Invalid inspection strategy',
      };
    }

    this.state.inspectionStrategy = strategy;
    if (strategy === 'sampling' && sampleSize) {
      this.state.sampleSize = sampleSize;
    }

    await this.saveGameState();

    return {
      success: true,
      message: `Inspection strategy set to: ${strategy}`,
      data: {
        strategy,
        sampleSize: strategy === 'sampling' ? this.state.sampleSize : undefined,
      },
    };
  }

  private async processBatch(): Promise<ActionResult> {
    const batchSize = 1000;
    const defectCount = Math.round(batchSize * (this.state.currentDefectRate / 100));

    let inspectionCost = 0;
    let defectsDetected = 0;
    let defectsPassedToCustomer = 0;

    switch (this.state.inspectionStrategy) {
      case '100%':
        // Inspect all units
        inspectionCost = batchSize * this.state.config.inspectionCostPerUnit;
        defectsDetected = defectCount;
        defectsPassedToCustomer = 0;
        break;

      case 'sampling':
        // Inspect sample
        inspectionCost = this.state.sampleSize * this.state.config.inspectionCostPerUnit;
        const sampleDefects = Math.round(this.state.sampleSize * (this.state.currentDefectRate / 100));
        
        // If sample shows defects, catch some proportion
        if (sampleDefects > 0) {
          defectsDetected = Math.round(defectCount * 0.7); // Catch 70% through sampling
          defectsPassedToCustomer = defectCount - defectsDetected;
        } else {
          defectsPassedToCustomer = defectCount;
        }
        break;

      case 'none':
        // No inspection
        inspectionCost = 0;
        defectsDetected = 0;
        defectsPassedToCustomer = defectCount;
        break;
    }

    const defectCost = defectsPassedToCustomer * this.state.config.defectCostPerUnit;
    const batchCost = inspectionCost + defectCost;

    this.state.totalCost += batchCost;
    this.state.defectsDetected += defectsDetected;
    this.state.defectsPassedToCustomer += defectsPassedToCustomer;

    // Add control chart data point
    const { ucl, lcl } = this.calculateControlLimits();
    const outOfControl = this.state.currentDefectRate > ucl || this.state.currentDefectRate < lcl;

    this.state.controlChartData.push({
      batchId: this.state.currentBatch,
      defectRate: this.state.currentDefectRate,
      ucl,
      lcl,
      outOfControl,
    });

    // Move to next batch
    this.state.currentBatch++;

    // Check if complete
    if (this.state.currentBatch >= this.state.config.numBatches) {
      this.state.isComplete = true;
    }

    await this.saveGameState();

    return {
      success: true,
      message: `Batch ${this.state.currentBatch - 1} processed`,
      data: {
        batchId: this.state.currentBatch - 1,
        batchSize,
        defectCount,
        defectsDetected,
        defectsPassedToCustomer,
        costs: {
          inspection: inspectionCost,
          defect: defectCost,
          total: batchCost,
        },
        cumulativeCost: this.state.totalCost,
        outOfControl,
        isComplete: this.state.isComplete,
      },
    };
  }

  async advanceRound(): Promise<RoundResult> {
    // Auto-process batch
    return {
      success: true,
      message: 'Batch processing',
      roundNumber: this.state.currentBatch,
      isComplete: this.state.isComplete,
    };
  }

  async computeMetrics(): Promise<any> {
    this.ensureInitialized();

    const defectReductionRate = ((this.state.config.initialDefectRate - this.state.currentDefectRate) / 
      this.state.config.initialDefectRate) * 100;

    const targetAchieved = this.state.currentDefectRate <= this.state.config.targetDefectRate;

    return {
      defectRates: {
        initial: this.state.config.initialDefectRate.toFixed(2) + '%',
        current: this.state.currentDefectRate.toFixed(2) + '%',
        target: this.state.config.targetDefectRate.toFixed(2) + '%',
        reductionRate: defectReductionRate.toFixed(2) + '%',
      },
      targetAchieved,
      toolsApplied: this.state.toolsApplied.length + ' / 7',
      costs: {
        total: `$${this.state.totalCost.toLocaleString()}`,
        perBatch: `$${(this.state.totalCost / this.state.currentBatch).toFixed(2)}`,
      },
      defects: {
        detected: this.state.defectsDetected,
        passedToCustomer: this.state.defectsPassedToCustomer,
        detectionRate: this.state.defectsDetected + this.state.defectsPassedToCustomer > 0
          ? ((this.state.defectsDetected / (this.state.defectsDetected + this.state.defectsPassedToCustomer)) * 100).toFixed(2) + '%'
          : 'N/A',
      },
      performanceGrade: this.calculatePerformanceGrade(targetAchieved, defectReductionRate),
    };
  }

  getPublicState(): any {
    if (!this.isInitialized) return null;

    return {
      currentBatch: this.state.currentBatch,
      maxBatches: this.state.config.numBatches,
      currentDefectRate: this.state.currentDefectRate,
      targetDefectRate: this.state.config.targetDefectRate,
      toolsApplied: this.state.toolsApplied.map(t => t.tool),
      inspectionStrategy: this.state.inspectionStrategy,
      sampleSize: this.state.sampleSize,
      totalCost: this.state.totalCost,
      isComplete: this.state.isComplete,
    };
  }

  getParticipantState(participantId: string): any {
    if (!this.isInitialized) return null;

    return {
      ...this.getPublicState(),
      defectData: this.state.defectData,
      toolsAppliedDetails: this.state.toolsApplied,
      controlChartData: this.state.controlChartData,
      metrics: this.state.isComplete ? this.computeMetrics() : undefined,
    };
  }

  // ===== HELPER METHODS =====

  private generateDefectData(count: number, defectRate: number): DefectData[] {
    const data: DefectData[] = [];
    const shifts = ['A', 'B', 'C'];
    const operators = ['John', 'Mary', 'Bob', 'Alice', 'Charlie'];
    const machines = ['M1', 'M2', 'M3', 'M4'];
    const defectTypes = ['Scratch', 'Dent', 'Misalignment', 'Color defect', 'Size error'];

    for (let i = 0; i < count; i++) {
      const sampleSize = 100;
      const defectCount = Math.round(sampleSize * (defectRate / 100) * (0.8 + Math.random() * 0.4));

      data.push({
        batchId: i + 1,
        shift: shifts[Math.floor(Math.random() * shifts.length)] as 'A' | 'B' | 'C',
        operator: operators[Math.floor(Math.random() * operators.length)],
        machine: machines[Math.floor(Math.random() * machines.length)],
        defectType: defectTypes[Math.floor(Math.random() * defectTypes.length)],
        defectCount,
        sampleSize,
        timestamp: new Date(Date.now() - (count - i) * 24 * 3600 * 1000),
      });
    }

    return data;
  }

  private calculateToolImpact(tool: string, analysis: any): QCToolResult {
    const toolImpacts: { [key: string]: { reduction: number; insight: string } } = {
      'Check Sheet': {
        reduction: 5,
        insight: 'Data collection revealed Shift B has 30% more defects than other shifts.',
      },
      'Histogram': {
        reduction: 8,
        insight: 'Distribution shows defect clustering around specific machines.',
      },
      'Pareto Chart': {
        reduction: 15,
        insight: '80% of defects come from 2 defect types: Scratch and Misalignment.',
      },
      'Fishbone Diagram': {
        reduction: 12,
        insight: 'Root cause identified: Machine M2 calibration drift.',
      },
      'Scatter Plot': {
        reduction: 7,
        insight: 'Strong correlation between operator experience and defect rate.',
      },
      'Flowchart': {
        reduction: 10,
        insight: 'Process mapping revealed inspection step was being skipped.',
      },
      'Control Chart': {
        reduction: 18,
        insight: 'Process brought into statistical control; special causes eliminated.',
      },
    };

    const impact = toolImpacts[tool] || { reduction: 5, insight: 'Analysis completed.' };

    return {
      tool,
      applied: true,
      insight: impact.insight,
      defectReduction: impact.reduction,
    };
  }

  private calculateControlLimits(): { ucl: number; lcl: number } {
    // Calculate from recent data
    const recentData = this.state.controlChartData.slice(-10);
    
    if (recentData.length < 3) {
      return {
        ucl: this.state.config.initialDefectRate * 1.5,
        lcl: Math.max(0, this.state.config.initialDefectRate * 0.5),
      };
    }

    const mean = recentData.reduce((sum, d) => sum + d.defectRate, 0) / recentData.length;
    const stdDev = Math.sqrt(
      recentData.reduce((sum, d) => sum + Math.pow(d.defectRate - mean, 2), 0) / recentData.length
    );

    return {
      ucl: mean + 3 * stdDev,
      lcl: Math.max(0, mean - 3 * stdDev),
    };
  }

  private calculatePerformanceGrade(targetAchieved: boolean, reductionRate: number): string {
    if (targetAchieved && reductionRate >= 70) return 'Excellent (Six Sigma Level) ⭐⭐⭐⭐⭐';
    if (targetAchieved && reductionRate >= 50) return 'Very Good ⭐⭐⭐⭐';
    if (reductionRate >= 40) return 'Good ⭐⭐⭐';
    if (reductionRate >= 25) return 'Fair ⭐⭐';
    return 'Needs Improvement ⭐';
  }

  private async saveGameState(): Promise<void> {
    await prisma.gameState.create({
      data: {
        session_id: this.sessionId,
        round_number: this.state.currentBatch,
        state_data: this.state as any,
      },
    });
  }
}

