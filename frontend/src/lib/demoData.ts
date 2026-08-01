// Static sample data for Interactive Product Demo
// Contains all Business Objects: health, metrics, insights, risks, recommendations, evidence, impact, timeline

export interface DemoData {
  project: {
    title: string;
    industry: string;
    language: string;
    status: string;
  };
  business_health: {
    score: number;
    level: string;
    summary: string;
  };
  executive_summary: {
    content: string;
  };
  metrics: Array<{
    id: string;
    name: string;
    value: string;
    trend: string;
  }>;
  insights: Array<{
    id: string;
    title: string;
    description: string;
    confidence: string;
    evidence?: {
      source_sheet: string;
      source_range: string;
      source_columns: string[];
      source_rows: string;
      reason: string;
      confidence: string;
    };
  }>;
  risks: Array<{
    id: string;
    title: string;
    description: string;
    severity: string;
    evidence?: {
      source_sheet: string;
      source_range: string;
      source_columns: string[];
      source_rows: string;
      reason: string;
      confidence: string;
    };
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    evidence?: {
      source_sheet: string;
      source_range: string;
      source_columns: string[];
      source_rows: string;
      reason: string;
      confidence: string;
    };
    expected_impact?: {
      business_health_change: string;
      risk_change: string;
      expected_result: string;
      confidence: string;
    };
  }>;
  timeline: Array<{
    id: number;
    created_at: string;
    business_health_score: number;
    summary: string;
  }>;
}

export const DEMO_DATA: DemoData = {
  project: {
    title: "Quarterly Sales Demo",
    industry: "sales",
    language: "en",
    status: "completed",
  },
  business_health: {
    score: 78,
    level: "Good",
    summary: "Overall sales performance is healthy with growth in consumer electronics. Regional expansion and seasonal inventory are key areas to monitor.",
  },
  executive_summary: {
    content:
      "This quarterly sales analysis covers Q1-Q2 2026 across three product categories (Consumer Electronics, Home Appliances, Mobile Accessories) in four regions (North America, Europe, Asia Pacific, Latin America). Total revenue reached $12.4M, up 14.2% year-over-year. Consumer Electronics leads with $5.8M (46.8% share), while Mobile Accessories shows the fastest growth at 22.1%. Key risks include seasonal inventory buildup in Home Appliances and declining ASP in Mobile Accessories. Recommended actions focus on regional expansion in Asia Pacific and promotional bundling to clear excess home appliance inventory.",
  },
  metrics: [
    { id: "metric_a1b2c3d", name: "Total Revenue", value: "$12.4M", trend: "up" },
    { id: "metric_e4f5g6h", name: "YoY Growth", value: "+14.2%", trend: "up" },
    { id: "metric_i7j8k9l", name: "Units Sold", value: "48,320", trend: "up" },
    { id: "metric_m0n1o2p", name: "Avg. Order Value", value: "$256", trend: "stable" },
    { id: "metric_q3r4s5t", name: "Active SKUs", value: "142", trend: "down" },
  ],
  insights: [
    {
      id: "insight_a1b2c3d",
      title: "Consumer Electronics dominates revenue at 46.8%",
      description: "Consumer Electronics generated $5.8M in revenue, accounting for nearly half of total sales. The category grew 18.3% YoY driven by premium smart home devices and gaming peripherals.",
      confidence: "high",
      evidence: {
        source_sheet: "Q2_Sales_Data",
        source_range: "B2:E45",
        source_columns: ["Category", "Revenue", "YoY_Growth"],
        source_rows: "Rows 2-45",
        reason: "Consumer Electronics revenue of $5.8M represents 46.8% of $12.4M total, with 18.3% YoY growth confirmed by Q1-Q2 comparison.",
        confidence: "high",
      },
    },
    {
      id: "insight_e4f5g6h",
      title: "Asia Pacific region shows strongest growth momentum",
      description: "Asia Pacific grew 24.6% quarter-over-quarter, outpacing all other regions. Mobile Accessories and Consumer Electronics both saw double-digit growth in this market.",
      confidence: "high",
      evidence: {
        source_sheet: "Q2_Sales_Data",
        source_range: "G2:J45",
        source_columns: ["Region", "Revenue", "QoQ_Growth"],
        source_rows: "Rows 2-45",
        reason: "Asia Pacific QoQ growth of 24.6% exceeds North America (8.2%), Europe (11.7%), and Latin America (15.3%).",
        confidence: "high",
      },
    },
    {
      id: "insight_i7j8k9l",
      title: "Mobile Accessories ASP declining despite volume growth",
      description: "While Mobile Accessories unit sales grew 31.2%, average selling price dropped 7.3% due to increased competition and promotional discounting in the entry-level segment.",
      confidence: "medium",
      evidence: {
        source_sheet: "Q2_Sales_Data",
        source_range: "A12:F28",
        source_columns: ["Product", "Units", "ASP", "ASP_Change"],
        source_rows: "Rows 12-28",
        reason: "ASP declined from $34.20 to $31.70 (-7.3%) while units grew 31.2%, indicating price-driven volume growth rather than value creation.",
        confidence: "medium",
      },
    },
    {
      id: "insight_m0n1o2p",
      title: "Home Appliances seasonal peak approaching with excess inventory",
      description: "Home Appliances typically peaks in Q3, but current inventory levels are 22% above seasonal average. This creates both opportunity and risk for the upcoming quarter.",
      confidence: "medium",
    },
  ],
  risks: [
    {
      id: "risk_a1b2c3d",
      title: "Excess Home Appliances inventory before peak season",
      description: "Current inventory is 22% above the seasonal average, risking margin compression from clearance discounts if sell-through is below forecast. Storage costs have already increased 8% quarter-over-quarter.",
      severity: "high",
      evidence: {
        source_sheet: "Inventory_Analysis",
        source_range: "C5:F18",
        source_columns: ["Category", "Current_Stock", "Seasonal_Avg", "Excess_%"],
        source_rows: "Rows 5-18",
        reason: "Home Appliances inventory at 22% above seasonal average with Q3 peak demand still 4-6 weeks away. Storage cost increase of 8% compounds the risk.",
        confidence: "high",
      },
    },
    {
      id: "risk_e4f5g6h",
      title: "Over-reliance on North American market",
      description: "North America contributes 41.3% of total revenue. Any regional economic downturn or regulatory change would disproportionately impact overall business performance.",
      severity: "medium",
      evidence: {
        source_sheet: "Q2_Sales_Data",
        source_range: "G2:J45",
        source_columns: ["Region", "Revenue", "Share_%"],
        source_rows: "Rows 2-45",
        reason: "North America revenue share of 41.3% compared to Europe (24.1%), Asia Pacific (21.8%), and Latin America (12.8%).",
        confidence: "high",
      },
    },
    {
      id: "risk_i7j8k9l",
      title: "Mobile Accessories margin erosion from price competition",
      description: "ASP has declined for three consecutive quarters. If this trend continues, the category may reach break-even within 2-3 quarters despite strong volume growth.",
      severity: "medium",
      evidence: {
        source_sheet: "Q2_Sales_Data",
        source_range: "A12:F28",
        source_columns: ["Product", "ASP", "Margin_%", "ASP_Trend"],
        source_rows: "Rows 12-28",
        reason: "Three consecutive quarters of ASP decline: Q4 -2.1%, Q1 -4.8%, Q2 -7.3%. Gross margin fell from 42% to 35% over the same period.",
        confidence: "medium",
      },
    },
  ],
  recommendations: [
    {
      id: "recommendation_a1b2c3d",
      title: "Launch promotional bundle for Home Appliances clearance",
      description: "Create limited-time bundles combining slow-moving home appliances with fast-selling mobile accessories. Target 15-20% inventory reduction before peak season begins. Use historical purchase patterns to design bundles with highest take-rate probability.",
      priority: "high",
      evidence: {
        source_sheet: "Inventory_Analysis",
        source_range: "C5:F18",
        source_columns: ["Category", "Excess_Units", "Bundle_Affinity"],
        source_rows: "Rows 5-18",
        reason: "Bundle affinity analysis shows 68% of mobile accessory buyers also purchase home appliances within 90 days, making bundle promotion highly effective.",
        confidence: "high",
      },
      expected_impact: {
        business_health_change: "+6",
        risk_change: "Reduced — inventory risk drops from high to medium",
        expected_result: "15-20% inventory reduction within 4 weeks, recovering ~$340K in working capital and reducing storage costs by 8%.",
        confidence: "high",
      },
    },
    {
      id: "recommendation_e4f5g6h",
      title: "Accelerate Asia Pacific expansion with localized product lineup",
      description: "Allocate 30% of Q3 marketing budget to Asia Pacific markets. Launch region-specific SKUs identified from local market research. Hire 2 regional account managers to support channel partners in Southeast Asia.",
      priority: "high",
      evidence: {
        source_sheet: "Q2_Sales_Data",
        source_range: "G2:J45",
        source_columns: ["Region", "Revenue", "QoQ_Growth", "Market_Size"],
        source_rows: "Rows 2-45",
        reason: "Asia Pacific growing at 24.6% QoQ with a $4.2B addressable market. Current market penetration is only 3.1%, indicating significant growth headroom.",
        confidence: "high",
      },
      expected_impact: {
        business_health_change: "+4",
        risk_change: "Reduced — North America concentration risk drops from 41.3% to ~37%",
        expected_result: "Projected additional $1.1M in revenue within 6 months, reducing North America revenue concentration by 4-5 percentage points.",
        confidence: "medium",
      },
    },
    {
      id: "recommendation_i7j8k9l",
      title: "Introduce premium Mobile Accessories tier to counter ASP decline",
      description: "Launch a premium accessories line with enhanced materials and exclusive designs. Target 25% price premium over current ASP. Position as lifestyle accessories rather than commodity replacements.",
      priority: "medium",
      expected_impact: {
        business_health_change: "+3",
        risk_change: "Partially mitigated — margin stabilization expected",
        expected_result: "Premium tier targeting $48+ ASP could lift blended ASP by 12-15%, recovering gross margin from 35% to ~40% within 2 quarters.",
        confidence: "medium",
      },
    },
    {
      id: "recommendation_m0n1o2p",
      title: "Implement automated demand forecasting for inventory optimization",
      description: "Deploy a demand sensing system using historical sales data and seasonal patterns. Reduce safety stock levels by 10-15% while maintaining 98% service level targets. Integrate with procurement to automate reorder points.",
      priority: "medium",
      expected_impact: {
        business_health_change: "+4",
        risk_change: "Reduced — systemic inventory risk mitigation",
        expected_result: "10-15% working capital reduction, $210K annual carrying cost savings, and 40% fewer stockout incidents.",
        confidence: "low",
      },
    },
  ],
  timeline: [
    {
      id: 1,
      created_at: "2026-07-15T14:30:00Z",
      business_health_score: 72,
      summary: "Initial Q1 analysis. Revenue at $10.9M with strong Consumer Electronics performance. Home Appliances inventory flagged as potential risk going into Q2.",
    },
    {
      id: 2,
      created_at: "2026-07-22T09:15:00Z",
      business_health_score: 75,
      summary: "Mid-Q2 update. Asia Pacific growth accelerating. Mobile Accessories ASP decline noted for the first time. Inventory buildup becoming more pronounced.",
    },
    {
      id: 3,
      created_at: "2026-07-28T16:45:00Z",
      business_health_score: 78,
      summary: "End of Q2 comprehensive analysis. Revenue reached $12.4M (+14.2% YoY). Consumer Electronics remains the growth engine. Inventory risk elevated. Four actionable recommendations identified with impact estimates.",
    },
  ],
};