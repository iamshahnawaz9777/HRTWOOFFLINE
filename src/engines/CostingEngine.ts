// EvA ERP Cloud - CostingEngine & Linear Nesting Optimizer

export interface NestingResult {
  barsCount: number;
  cuttingMap: number[][]; // Array of cuts inside each bar: e.g. [[1500, 1500, 1500, 1200], [1200]]
  wasteLength: number; // total remaining length wasted
  wastePercent: number;
}

export interface CostBreakdown {
  glassArea: number;
  glassRate: number;
  glassTotal: number;
  
  profileCutLengths: number[];
  nestingResult: NestingResult;
  profileRatePerBar: number;
  profileTotal: number;
  
  fittings: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  fittingsTotal: number;
  
  fabricationCost: number;
  installationCost: number;
  subtotal: number;
  markupPercent: number;
  markupAmount: number;
  finalTotal: number;
}

export class CostingEngine {
  // Rates configuration
  private static GLASS_RATES: Record<string, number> = {
    '6mm Clear Tempered': 40.00,       // per SqM
    '8mm Frosted': 60.00,              // per SqM
    '12mm Double-Glazed': 110.00,      // per SqM
    '10mm Clear Tempered': 50.00,      // per SqM
    '12mm Frosted': 75.00              // per SqM
  };

  private static PROFILE_RATES: Record<string, number> = {
    'Alu-Black-Matte': 110.00,          // per 6-meter bar
    'Alu-Rose-Gold': 170.00,           // per 6-meter bar
    'UPVC-White': 75.00,               // per 6-meter bar
    'Alu-Silver-Anodized': 95.00       // per 6-meter bar
  };

  public static BAR_STOCK_LENGTH_MM = 6000; // Standard 6m aluminum bar profile

  /**
   * 1D Nesting / Bin Packing Optimizer (Greedy Descending / First Fit Decreasing)
   * Calculates the optimal cutting map of raw bars (6000mm) needed for specific cut lengths.
   */
  public static optimizeLinearNesting(cuts: number[], barLength: number = CostingEngine.BAR_STOCK_LENGTH_MM): NestingResult {
    // Sort cuts in descending order to process larger pieces first (standard FFD algorithm)
    const sortedCuts = [...cuts].sort((a, b) => b - a);
    
    const cuttingMap: number[][] = [];
    const barRemainders: number[] = [];

    for (const cut of sortedCuts) {
      if (cut > barLength) {
        throw new Error(`Cut size ${cut}mm exceeds standard stock bar length of ${barLength}mm`);
      }

      // Try to find a bar that has enough space remaining
      let placed = false;
      for (let i = 0; i < barRemainders.length; i++) {
        if (barRemainders[i] >= cut) {
          cuttingMap[i].push(cut);
          barRemainders[i] -= cut;
          placed = true;
          break;
        }
      }

      // If no existing bar can accommodate the cut, open a new bar
      if (!placed) {
        cuttingMap.push([cut]);
        barRemainders.push(barLength - cut);
      }
    }

    const totalCutsLength = cuts.reduce((sum, val) => sum + val, 0);
    const barsCount = cuttingMap.length;
    const totalCapacity = barsCount * barLength;
    const wasteLength = barRemainders.reduce((sum, val) => sum + val, 0);
    const wastePercent = totalCapacity > 0 ? (wasteLength / totalCapacity) * 100 : 0;

    return {
      barsCount,
      cuttingMap,
      wasteLength,
      wastePercent
    };
  }

  /**
   * Calculates structural profile cut segments required for the layout.
   */
  public static getProfileCuts(width: number, height: number, divisions: { type: 'horizontal' | 'vertical', position: number }[]): number[] {
    const cuts: number[] = [];
    
    // Outer frame contains 2 width profiles and 2 height profiles
    cuts.push(width, width);
    cuts.push(height, height);

    // Inner mullions and transoms
    divisions.forEach(div => {
      if (div.type === 'horizontal') {
        // transom length matches outer frame width minus profile clearances (approx frame width)
        cuts.push(width - 100); // 50mm clearance on each side
      } else {
        // mullion length
        cuts.push(height - 100);
      }
    });

    return cuts;
  }

  /**
   * Main cost calculation engine
   */
  public static calculateCost(
    design: {
      width: number;
      height: number;
      type: string;
      glassType: string;
      profileType: string;
      divisions: { type: 'horizontal' | 'vertical', position: number }[];
      fittings: { id: string; quantity: number }[];
    },
    fittingsCatalog: { id: string; name: string; price: number }[]
  ): CostBreakdown {
    // 1. Glass Costing
    const widthM = design.width / 1000;
    const heightM = design.height / 1000;
    const glassArea = widthM * heightM * 0.92; // Effective glass area (excluding frame width)
    const glassRate = this.GLASS_RATES[design.glassType] || 45.00;
    const glassTotal = Number((glassArea * glassRate).toFixed(2));

    // 2. Profile Costing (via linear nesting)
    const cutLengths = this.getProfileCuts(design.width, design.height, design.divisions);
    const nestingResult = this.optimizeLinearNesting(cutLengths, this.BAR_STOCK_LENGTH_MM);
    const profileRatePerBar = this.PROFILE_RATES[design.profileType] || 100.00;
    const profileTotal = nestingResult.barsCount * profileRatePerBar;

    // 3. Fittings Costing
    const fittingsCostList = design.fittings.map(item => {
      const dbFitting = fittingsCatalog.find(f => f.id === item.id);
      const name = dbFitting ? dbFitting.name : 'Hardware Fitting';
      const price = dbFitting ? Number(dbFitting.price) : 10.00;
      const total = Number((price * item.quantity).toFixed(2));
      
      return {
        id: item.id,
        name,
        quantity: item.quantity,
        price,
        total
      };
    });
    const fittingsTotal = fittingsCostList.reduce((sum, f) => sum + f.total, 0);

    // 4. Labor and Assembly
    // Assume basic fabrication labor cost is $15 per SqM plus $20 per transom/mullion cut
    const fabricationCost = Number((glassArea * 25 + design.divisions.length * 15).toFixed(2));
    
    // Installation overhead (higher for facade systems)
    const baseInstall = design.type === 'facade' ? 80 : 40;
    const installationCost = Number((glassArea * baseInstall).toFixed(2));

    const subtotal = Number((glassTotal + profileTotal + fittingsTotal + fabricationCost + installationCost).toFixed(2));
    
    // Profit margin / markup
    const markupPercent = 25; // 25% standard profit markup
    const markupAmount = Number((subtotal * (markupPercent / 100)).toFixed(2));
    const finalTotal = Number((subtotal + markupAmount).toFixed(2));

    return {
      glassArea,
      glassRate,
      glassTotal,
      profileCutLengths: cutLengths,
      nestingResult,
      profileRatePerBar,
      profileTotal,
      fittings: fittingsCostList,
      fittingsTotal,
      fabricationCost,
      installationCost,
      subtotal,
      markupPercent,
      markupAmount,
      finalTotal
    };
  }
}
