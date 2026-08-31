/**
 * M2.14.5 Phase1.1 Hotfix 2 Focused Display Regression.
 *
 * Simulates the final customer-visible text of the focused insight page from
 * the display adapter, so JSON structures, internal field labels, and
 * recommendation/insight noise in evidence can never reach the rendered page.
 */
import assert from "node:assert/strict";
import { toFocusedInsightDisplay } from "../../frontend/src/lib/focusedInsightDisplay.ts";

const rawCard = {
  title: "利润优化：聚焦大型影像设备毛利率提升",
  finding: "大型影像设备毛利率仅30%",
  evidence: [
    "MRI毛利率30%",
    "CT毛利率30%",
    "推荐建议：提升大型影像设备毛利率",
    "洞察：大型影像设备毛利率低于整体水平",
    "建议：补充客户与销售管道字段（优先级：high）",
  ],
  explanation: "高毛利产品占比下降导致整体毛利率承压。",
  action: "1. 优化采购成本；2. 调整产品组合；3. 加强高利润产品销售。",
};

const inputs = [
  JSON.stringify(rawCard),
  "```json\n" + JSON.stringify(rawCard) + "\n```",
  { focused_insight: JSON.stringify(rawCard) },
  { finding: JSON.stringify(rawCard) },
  JSON.stringify(JSON.stringify(rawCard)),
  rawCard,
];

function render(display) {
  return [
    "专项深入分析",
    `一、核心发现：${display.coreFinding}`,
    `二、数据依据：${display.evidencePoints.join("；")}`,
    `三、原因分析：${display.causeAnalysis}`,
    `四、建议行动：${display.actionItems.join("；")}`,
  ].join("\n");
}

for (const input of inputs) {
  const display = toFocusedInsightDisplay(input);
  assert.ok(display.headline.includes("利润优化"), "headline missing");
  assert.ok(display.coreFinding.includes("毛利率仅30%"), "finding missing");
  assert.ok(display.evidencePoints.includes("MRI毛利率30%"), "factual evidence lost");
  assert.ok(display.evidencePoints.includes("CT毛利率30%"), "factual evidence lost");
  assert.ok(!display.evidencePoints.some((item) => item.includes("推荐建议")), "recommendation leaked into evidence");
  assert.ok(!display.evidencePoints.some((item) => item.includes("优先级")), "priority leaked into evidence");
  assert.ok(display.actionItems.some((item) => item.includes("提升大型影像设备毛利率")), "suggestion not moved to action");
  assert.ok(display.actionItems.some((item) => item.includes("优化采购成本")), "action item missing");
  assert.ok(display.actionItems.some((item) => item.includes("调整产品组合")), "action item missing");
  assert.ok(display.actionItems.some((item) => item.includes("加强高利润产品销售")), "action item missing");

  const rendered = render(display);
  assert.ok(rendered.includes("专项深入分析"), "page label missing");
  assert.ok(rendered.includes("一、核心发现"), "finding section missing");
  assert.ok(rendered.includes("二、数据依据"), "evidence section missing");
  assert.ok(rendered.includes("三、原因分析"), "explanation section missing");
  assert.ok(rendered.includes("四、建议行动"), "action section missing");
  for (const banned of ["{", "}", "title:", "finding:", "evidence:", "explanation:", "action:", "```", "<pre", "json"]) {
    assert.ok(!rendered.toLowerCase().includes(banned), `banned content in rendered text: ${banned}`);
  }
}

const mixed = toFocusedInsightDisplay({
  title: "客户集中度",
  finding: "top1 客户占比 34%",
  evidence: "系统覆盖度仅为0.4；pipeline_health、customer_risk、productivity 三个维度不可用",
  explanation: "缺少客户标识字段。",
  action: ["补充客户名称字段", "完善销售阶段字段"],
});
assert.ok(mixed.evidencePoints.length >= 2, "string evidence should split");
assert.equal(mixed.actionItems.length, 2, "array action should stay a list");

const legacy = toFocusedInsightDisplay({
  title: "销售下降原因",
  finding: "季度环比下降8%",
  evidence: "季度销售额 120万；客户数下降12%",
  explanation: "客户流失增加。",
  action: "拓展新客户。提升复购率。",
});
assert.ok(legacy.actionItems.length >= 2, "long action string should split");

console.log("FOCUSED DISPLAY REGRESSION PASS");
