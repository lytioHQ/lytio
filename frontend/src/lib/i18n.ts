export const SUPPORTED_UI_LANGS = ["zh", "en", "ja", "de"] as const;
export type UILanguage = (typeof SUPPORTED_UI_LANGS)[number];

export const SUPPORTED_REPORT_LANGS = ["zh", "en", "ja", "de"] as const;
export type ReportLanguage = (typeof SUPPORTED_REPORT_LANGS)[number] | "follow";

export const LANG_LABELS: Record<UILanguage, string> = {
  zh: "\u4e2d\u6587",
  en: "English",
  ja: "\u65e5\u672c\u8a9e",
  de: "Deutsch",
};

export const REPORT_LANG_LABELS: Record<ReportLanguage, string> = {
  follow: "\u8ddf\u968f UI \u8bed\u8a00",
  zh: "\u4e2d\u6587",
  en: "English",
  ja: "\u65e5\u672c\u8a9e",
  de: "Deutsch",
};

type TranslationDict = Record<string, string>;

const zh: TranslationDict = {
  "nav.sales": "\u9500\u552e\u5206\u6790",
  "nav.finance": "\u8d22\u52a1\u5206\u6790",
  "nav.inventory": "\u5e93\u5b58\u5206\u6790",
  "nav.hr": "\u4eba\u529b\u8d44\u6e90",
  "nav.energy": "\u80fd\u6e90\u5206\u6790",
  "nav.procurement": "\u91c7\u8d2d\u5206\u6790",
  "nav.custom": "\u81ea\u5b9a\u4e49",
  "nav.comingSoon": "\u5373\u5c06\u63a8\u51fa",

  "header.title": "ExcelPilot",
  "header.tagline": "AI Excel \u5206\u6790\u5e73\u53f0",
  "header.version": "v0.2 Beta",
  "header.online": "Backend \u5df2\u8fde\u63a5",
  "header.offline": "Backend \u79bb\u7ebf",
  "header.checking": "\u68c0\u67e5\u4e2d...",

  "lang.uiLabel": "UI \u8bed\u8a00",
  "lang.reportLabel": "\u62a5\u544a\u8bed\u8a00",
  "lang.followUI": "\u8ddf\u968f UI \u8bed\u8a00",

  "step1.title": "\u4e0a\u4f20 Excel \u6587\u4ef6",
  "step1.desc": "\u9009\u62e9 .xlsx \u6216 .xls \u6587\u4ef6\u8fdb\u884c\u5206\u6790",
  "step1.dragHint": "\u62d6\u62fd Excel \u6587\u4ef6\u5230\u6b64\u5904\u6216\u70b9\u51fb\u6d4f\u89c8",
  "step1.fileTypes": "\u652f\u6301 .xlsx \u548c .xls \u6587\u4ef6\uff0c\u6700\u5927 20 MB",
  "step1.browse": "\u6d4f\u89c8\u6587\u4ef6",
  "step1.uploadBtn": "\u4e0a\u4f20\u5e76\u5206\u6790",
  "step1.uploading": "\u4e0a\u4f20\u4e2d...",

  "step2.processing": "\u6b63\u5728\u5904\u7406\u6570\u636e...",
  "step2.title": "\u6570\u636e\u9a8c\u8bc1",
  "step2.desc": "\u6587\u4ef6\u5904\u7406\u6210\u529f",
  "step2.uploaded": "\u5df2\u4e0a\u4f20",
  "step2.worksheet": "\u5de5\u4f5c\u8868",
  "step2.dataRows": "\u6570\u636e\u884c",
  "step2.columns": "\u5217",

  "step3.title": "AI \u5206\u6790",
  "step3.desc": "\u5bf9\u6570\u636e\u8fd0\u884c\u9500\u552e\u5206\u6790",
  "step3.analyze": "\u5206\u6790\u9500\u552e\u6570\u636e",
  "step3.analyzing": "AI \u5206\u6790\u4e2d...",

  "report.title": "\u5206\u6790\u62a5\u544a",
  "report.desc": "AI \u751f\u6210\u7684\u4e1a\u52a1\u6d1e\u5bdf",
  "report.salesIntel": "\u9500\u552e\u60c5\u62a5",
  "report.aiGenerated": "AI \u751f\u6210",
  "report.execSummary": "\u6267\u884c\u6458\u8981",
  "report.keyFindings": "\u5173\u952e\u53d1\u73b0",
  "report.insightsFound": "{n} \u6761\u6d1e\u5bdf",
  "report.riskAnalysis": "\u98ce\u9669\u5206\u6790",
  "report.risksFound": "\u53d1\u73b0 {n} \u4e2a\u98ce\u9669",
  "report.recommendations": "\u5efa\u8bae",
  "report.actionable": "\u53ef\u6267\u884c\u7684\u4e0b\u4e00\u6b65",
  "report.kpi.rows": "\u6570\u636e\u884c",
  "report.kpi.findings": "\u53d1\u73b0",
  "report.kpi.risks": "\u98ce\u9669",
  "report.kpi.suggestions": "\u5efa\u8bae",
  "report.footer.completed": "AI \u5206\u6790\u5df2\u5b8c\u6210",
  "report.footer.analysisTime": "\u5206\u6790\u65f6\u95f4",
  "report.footer.dataSize": "\u6570\u636e\u89c4\u6a21",
  "report.footer.generated": "\u62a5\u544a\u751f\u6210",
  "report.footer.rows": "\u884c",
  "report.multiLang": "\u68c0\u6d4b\u5230\u6e90\u6570\u636e\u5305\u542b\u591a\u79cd\u8bed\u8a00\u3002",

  "recs.title": "\u63a8\u8350\u4e0b\u4e00\u6b65\u5206\u6790",
  "chat.title": "\u7ee7\u7eed\u5206\u6790",
  "chat.desc": "\u57fa\u4e8e\u5f53\u524d\u62a5\u544a\u7ee7\u7eed\u63d0\u95ee",
  "chat.placeholder": "\u8f93\u5165\u95ee\u9898\u4ee5\u6df1\u5165\u5206\u6790\u6570\u636e...",
  "chat.inputPlaceholder": "\u8f93\u5165\u60a8\u7684\u95ee\u9898...",
  "chat.send": "\u53d1\u9001",
  "chat.thinking": "AI \u601d\u8003\u4e2d...",
  "chat.error": "\u62b1\u6b49\uff0c\u56de\u590d\u5931\u8d25\u3002\u8bf7\u91cd\u8bd5\u3002",
  "chat.advancedInput": "+ \u81ea\u5b9a\u4e49\u63d0\u95ee",

  "ws.actions": "Recommended Actions",
  "ws.actionsDesc": "\u884c\u52a8\u8ba1\u5212\uff08\u672a\u6765\u7248\u672c\u63a8\u51fa\uff09",
  "ws.optPortfolio": "\u4f18\u5316\u4ea7\u54c1\u7ec4\u5408",
  "ws.optPortfolioDesc": "\u4ea7\u54c1\u6df7\u5408\u5206\u6790",
  "ws.regionalStrat": "\u533a\u57df\u7b56\u7565",
  "ws.regionalStratDesc": "\u5e02\u573a\u6269\u5c55\u8ba1\u5212",
  "ws.revForecast": "\u6536\u5165\u9884\u6d4b",
  "ws.revForecastDesc": "\u9884\u6d4b\u5efa\u6a21",
  "error.uploadFailed": "\u4e0a\u4f20\u5931\u8d25\u3002",
  "error.processingFailed": "\u5904\u7406\u5931\u8d25",
  "error.analysisFailed": "\u5206\u6790\u5931\u8d25",
  "error.generic": "\u64cd\u4f5c\u5931\u8d25",
  "beta.badge": "Beta",
  "beta.version": "\u7248\u672c",
  "beta.message": "\u611f\u8c22\u60a8\u5e2e\u52a9\u6539\u8fdb ExcelPilot\uff0c\u60a8\u7684\u53cd\u9988\u5c06\u76f4\u63a5\u5851\u9020\u672a\u6765\u7684\u7248\u672c\u3002",
  "timeline.title": "\u5206\u6790\u8fdb\u5ea6",
  "timeline.uploading": "\u4e0a\u4f20\u6587\u4ef6",
  "timeline.parsing": "\u89e3\u6790\u5de5\u4f5c\u7c3f",
  "timeline.detecting": "\u8bc6\u522b\u6570\u636e\u7c7b\u578b",
  "timeline.thinking": "AI \u601d\u8003\u4e2d",
  "timeline.generating": "\u6784\u5efa\u5546\u4e1a\u6d1e\u5bdf",
  "timeline.inProgress": "\u8fdb\u884c\u4e2d...",
  "timeline.failed": "\u5931\u8d25",
  "feedback.button": "\u53cd\u9988",
  "feedback.title": "\u53d1\u9001\u53cd\u9988",
  "feedback.subtitle": "\u5e2e\u52a9\u6211\u4eec\u6539\u8fdb ExcelPilot",
  "feedback.bug": "\u95ee\u9898\u53cd\u9988",
  "feedback.feature": "\u529f\u80fd\u5efa\u8bae",
  "feedback.suggestion": "\u4f18\u5316\u5efa\u8bae",
  "feedback.bugDesc": "\u62a5\u544a\u9519\u8bef\u6216\u5f02\u5e38\u884c\u4e3a",
  "feedback.featureDesc": "\u8bf7\u6c42\u65b0\u529f\u80fd",
  "feedback.suggestionDesc": "\u5206\u4eab\u6539\u8fdb\u60f3\u6cd5",
  "feedback.titleLabel": "\u6807\u9898",
  "feedback.descLabel": "\u8be6\u7ec6\u63cf\u8ff0",
  "feedback.titlePlaceholder": "\u7b80\u8981\u63cf\u8ff0\u95ee\u9898\u6216\u5efa\u8bae",
  "feedback.descPlaceholder": "\u8865\u5145\u7ec6\u8282\u3001\u590d\u73b0\u6b65\u9aa4\u7b49",
  "feedback.submit": "\u63d0\u4ea4\u53cd\u9988",
  "feedback.cancel": "\u53d6\u6d88",
  "feedback.back": "\u8fd4\u56de",
  "feedback.hint": "\u63d0\u4ea4\u540e\u5c06\u6253\u5f00\u60a8\u7684\u90ae\u4ef6\u5e94\u7528\u53d1\u9001\u53cd\u9988",
  "feedback.thanks": "\u611f\u8c22\u60a8\u7684\u53cd\u9988\uff01\u6211\u4eec\u5c06\u6301\u7eed\u6539\u8fdb\u3002",
  "journey.title": "\u5206\u6790\u65c5\u7a0b",
  "journey.upload": "\u4e0a\u4f20",
  "journey.aiAnalysis": "AI \u5206\u6790",
  "journey.businessInsight": "\u5546\u4e1a\u6d1e\u5bdf",
  "journey.continueAnalysis": "\u6301\u7eed\u5206\u6790",
  "journey.recommendedActions": "\u5efa\u8bae\u884c\u52a8",
  "continue.title": "\u6301\u7eed\u5206\u6790",
  "continue.subtitle": "\u9009\u62e9\u4e00\u4e2a\u65b9\u5411\u6df1\u5165\u5206\u6790\uff08\u7b2c\u4e00\u7248\u4e3a\u6a21\u677f\u5206\u6790\uff09",
  "continue.selectHint": "\u70b9\u51fb\u65b9\u5411\u67e5\u770b\u6a21\u677f\u5206\u6790",
  "continue.templateNote": "\u6a21\u677f\u5206\u6790 \u00b7 AI \u52a8\u6001\u8ddf\u8fdb\u5373\u5c06\u63a8\u51fa",
  "continue.decline": "\u4e3a\u4ec0\u4e48\u9500\u552e\u4e0b\u6ed1\uff1f",
  "continue.customerRisk": "\u5ba2\u6237\u98ce\u9669\u5206\u6790",
  "continue.product": "\u4ea7\u54c1\u8868\u73b0",
  "continue.regional": "\u533a\u57df\u8868\u73b0",
  "continue.manager": "\u9500\u552e\u7ecf\u7406\u5efa\u8bae",
  "continue.decline.desc": "\u805a\u7126\u6536\u5165\u4e0b\u6ed1\u7684\u6839\u56e0\uff1a\u65f6\u95f4\u62d0\u70b9\u3001\u4ea7\u54c1\u4e0e\u533a\u57df\u62d6\u7d2f\u9879\u3002",
  "continue.decline.p1": "\u6309\u6708\u4efd\u5bf9\u6bd4\u6536\u5165\u8d8b\u52bf\uff0c\u5b9a\u4f4d\u4e0b\u6ed1\u8d77\u59cb\u65f6\u95f4\u70b9",
  "continue.decline.p2": "\u8bc6\u522b\u4e0b\u6ed1\u6700\u4e25\u91cd\u7684\u4ea7\u54c1\u7ebf\u4e0e\u533a\u57df",
  "continue.decline.p3": "\u7ed3\u5408\u5f02\u5e38\u6570\u636e\u70b9\u7ed9\u51fa\u4f18\u5148\u7ea7\u6392\u67e5\u6e05\u5355",
  "continue.customerRisk.desc": "\u8bc4\u4f30\u5ba2\u6237\u96c6\u4e2d\u5ea6\u4e0e\u6d41\u5931\u98ce\u9669\uff0c\u8bc6\u522b\u5bf9\u6536\u5165\u5f71\u54cd\u6700\u5927\u7684\u5ba2\u6237\u3002",
  "continue.customerRisk.p1": "\u8ba1\u7b97\u524d\u5341\u5927\u5ba2\u6237\u6536\u5165\u5360\u6bd4\u4e0e\u96c6\u4e2d\u5ea6",
  "continue.customerRisk.p2": "\u8bc6\u522b\u8d2d\u4e70\u9891\u6b21\u4e0b\u964d\u6216\u91d1\u989d\u840e\u7f29\u7684\u5ba2\u6237",
  "continue.customerRisk.p3": "\u8f93\u51fa\u5ba2\u6237\u5065\u5eb7\u5ea6\u5206\u7ea7\u4e0e\u98ce\u9669\u63d0\u793a",
  "continue.product.desc": "\u62c6\u89e3\u4ea7\u54c1\u4e0e\u54c1\u7c7b\u8868\u73b0\uff0c\u53d1\u73b0\u62d6\u7d2f\u9879\u4e0e\u589e\u957f\u673a\u4f1a\u3002",
  "continue.product.p1": "\u6309\u4ea7\u54c1\u7ebf\u5bf9\u6bd4\u6536\u5165\u3001\u9500\u91cf\u4e0e\u5360\u6bd4\u53d8\u5316",
  "continue.product.p2": "\u8bc6\u522b\u4e0b\u6ed1\u4ea7\u54c1\u4e0e\u9ad8\u589e\u957f\u4ea7\u54c1",
  "continue.product.p3": "\u7ed9\u51fa\u4ea7\u54c1\u7ec4\u5408\u4f18\u5316\u5efa\u8bae",
  "continue.regional.desc": "\u5206\u6790\u533a\u57df\u4e1a\u7ee9\u5dee\u5f02\uff0c\u8bc6\u522b\u5e02\u573a\u98ce\u9669\u4e0e\u6269\u5f20\u673a\u4f1a\u3002",
  "continue.regional.p1": "\u6309\u533a\u57df\u5bf9\u6bd4\u6536\u5165\u8d8b\u52bf\u4e0e\u589e\u957f\u7387",
  "continue.regional.p2": "\u6807\u8bb0\u4e0b\u6ed1\u533a\u57df\u4e0e\u8fc7\u5ea6\u4f9d\u8d56\u5355\u4e00\u5e02\u573a\u7684\u98ce\u9669",
  "continue.regional.p3": "\u8f93\u51fa\u533a\u57df\u7b56\u7565\u5efa\u8bae",
  "continue.manager.desc": "\u9762\u5411\u9500\u552e\u7ba1\u7406\u8005\u7684\u884c\u52a8\u5efa\u8bae\uff0c\u57fa\u4e8e\u6570\u636e\u7ed9\u51fa\u53ef\u6267\u884c\u7684\u6539\u8fdb\u65b9\u5411\u3002",
  "continue.manager.p1": "\u63d0\u70bc\u5bf9\u7ba1\u7406\u56e2\u961f\u6700\u91cd\u8981\u7684\u4e09\u4e2a\u4fe1\u53f7",
  "continue.manager.p2": "\u6309\u4f18\u5148\u7ea7\u6392\u5217\u6539\u8fdb\u52a8\u4f5c",
  "continue.manager.p3": "\u7ed9\u51fa\u590d\u76d8\u4f1a\u8bae\u7684\u5173\u952e\u8ba8\u8bba\u70b9",
  "history.title": "\u5206\u6790\u5386\u53f2",
  "history.session": "\u4ec5\u4fdd\u5b58\u5728\u5f53\u524d\u6d4f\u89c8\u5668\u4f1a\u8bdd",
  "history.initial": "\u521d\u59cb\u5206\u6790",
  "history.followUp": "\u8ddf\u8fdb\u5206\u6790",
  "history.recommended": "\u5efa\u8bae\u884c\u52a8",
  "history.empty": "\u672c\u4f1a\u8bdd\u6682\u65e0\u5206\u6790\u8bb0\u5f55",
  "actions.title": "\u5efa\u8bae\u884c\u52a8",
  "actions.high": "\u9ad8\u4f18\u5148\u7ea7",
  "actions.medium": "\u4e2d\u4f18\u5148\u7ea7",
  "actions.low": "\u4f4e\u4f18\u5148\u7ea7",
  "actions.empty": "\u6682\u65e0\u53ef\u7528\u5efa\u8bae",

};

const en: TranslationDict = {
  "nav.sales": "Sales",
  "nav.finance": "Finance",
  "nav.inventory": "Inventory",
  "nav.hr": "HR",
  "nav.energy": "Energy",
  "nav.procurement": "Procurement",
  "nav.custom": "Custom",
  "nav.comingSoon": "Coming Soon",

  "header.title": "ExcelPilot",
  "header.tagline": "AI Excel Analysis Platform",
  "header.version": "v0.2 Beta",
  "header.online": "Backend Online",
  "header.offline": "Backend Offline",
  "header.checking": "Checking...",

  "lang.uiLabel": "UI Language",
  "lang.reportLabel": "Report Language",
  "lang.followUI": "Follow UI Language",

  "step1.title": "Upload Excel File",
  "step1.desc": "Select a .xlsx or .xls file to analyze",
  "step1.dragHint": "Drag your Excel file here or click to browse",
  "step1.fileTypes": "Supports .xlsx and .xls up to 20 MB",
  "step1.browse": "Browse Files",
  "step1.uploadBtn": "Upload & Analyze",
  "step1.uploading": "Uploading...",

  "step2.processing": "Processing your data...",
  "step2.title": "Data Validation",
  "step2.desc": "File processed successfully",
  "step2.uploaded": "Uploaded",
  "step2.worksheet": "Worksheet",
  "step2.dataRows": "Data Rows",
  "step2.columns": "Columns",

  "step3.title": "AI Analysis",
  "step3.desc": "Run sales analysis on your data",
  "step3.analyze": "Analyze Sales Data",
  "step3.analyzing": "AI Analyzing...",

  "report.title": "Analysis Report",
  "report.desc": "AI-generated business insights",
  "report.salesIntel": "Sales Intelligence",
  "report.aiGenerated": "AI-Generated",
  "report.execSummary": "Executive Summary",
  "report.keyFindings": "Key Findings",
  "report.insightsFound": "{n} insights discovered",
  "report.riskAnalysis": "Risk Analysis",
  "report.risksFound": "{n} risks identified",
  "report.recommendations": "Recommendations",
  "report.actionable": "Actionable next steps",
  "report.kpi.rows": "Data Rows",
  "report.kpi.findings": "Findings",
  "report.kpi.risks": "Risks",
  "report.kpi.suggestions": "Suggestions",
  "report.footer.completed": "AI Analysis Completed",
  "report.footer.analysisTime": "Analysis Time",
  "report.footer.dataSize": "Data Size",
  "report.footer.generated": "Report Generated",
  "report.footer.rows": "rows",
  "report.multiLang": "Multiple languages detected in source data.",

  "recs.title": "Recommended Next Analysis",
  "chat.title": "Continue Analysis",
  "chat.desc": "Ask follow-up questions based on the current report",
  "chat.placeholder": "Ask a question to dive deeper into the data...",
  "chat.inputPlaceholder": "Type your question...",
  "chat.send": "Send",
  "chat.thinking": "AI thinking...",
  "chat.error": "Sorry, failed to respond. Please try again.",
  "chat.advancedInput": "+ Custom Question",

  "ws.actions": "Recommended Actions",
  "ws.actionsDesc": "\u884c\u52a8\u8ba1\u5212\uff08\u672a\u6765\u7248\u672c\u63a8\u51fa\uff09",
  "ws.optPortfolio": "\u4f18\u5316\u4ea7\u54c1\u7ec4\u5408",
  "ws.optPortfolioDesc": "\u4ea7\u54c1\u6df7\u5408\u5206\u6790",
  "ws.regionalStrat": "\u533a\u57df\u7b56\u7565",
  "ws.regionalStratDesc": "\u5e02\u573a\u6269\u5c55\u8ba1\u5212",
  "ws.revForecast": "\u6536\u5165\u9884\u6d4b",
  "ws.revForecastDesc": "\u9884\u6d4b\u5efa\u6a21",
  "error.uploadFailed": "Upload failed.",
  "error.processingFailed": "Processing failed",
  "error.analysisFailed": "Analysis failed",
  "error.generic": "Operation failed",
  "beta.badge": "Beta",
  "beta.version": "Version",
  "beta.message": "Thank you for helping improve ExcelPilot. Your feedback directly shapes future releases.",
  "timeline.title": "Analysis Progress",
  "timeline.uploading": "Uploading",
  "timeline.parsing": "Parsing Workbook",
  "timeline.detecting": "Detecting Data Types",
  "timeline.thinking": "AI Thinking",
  "timeline.generating": "Building Business Insights",
  "timeline.inProgress": "In progress...",
  "timeline.failed": "Failed",
  "feedback.button": "Feedback",
  "feedback.title": "Send Feedback",
  "feedback.subtitle": "Help us improve ExcelPilot",
  "feedback.bug": "Bug Report",
  "feedback.feature": "Feature Request",
  "feedback.suggestion": "Suggestion",
  "feedback.bugDesc": "Report an error or unexpected behavior",
  "feedback.featureDesc": "Request a new feature",
  "feedback.suggestionDesc": "Share an improvement idea",
  "feedback.titleLabel": "Title",
  "feedback.descLabel": "Description",
  "feedback.titlePlaceholder": "Briefly describe the issue or idea",
  "feedback.descPlaceholder": "Add details, reproduction steps, etc.",
  "feedback.submit": "Submit Feedback",
  "feedback.cancel": "Cancel",
  "feedback.back": "Back",
  "feedback.hint": "Submitting will open your email client",
  "feedback.thanks": "Thank you! We will keep improving.",
  "journey.title": "Business Insight Journey",
  "journey.upload": "Upload",
  "journey.aiAnalysis": "AI Analysis",
  "journey.businessInsight": "Business Insight",
  "journey.continueAnalysis": "Continue Analysis",
  "journey.recommendedActions": "Recommended Actions",
  "continue.title": "Continue Analysis",
  "continue.subtitle": "Choose a direction to explore deeper (template-based in v1)",
  "continue.selectHint": "Select a direction to view the template",
  "continue.templateNote": "Template analysis \u00b7 AI-powered follow-up coming soon",
  "continue.decline": "Why did sales decline?",
  "continue.customerRisk": "Customer Risk Analysis",
  "continue.product": "Product Performance",
  "continue.regional": "Regional Performance",
  "continue.manager": "Sales Manager Suggestions",
  "continue.decline.desc": "Focus on the root causes of declining revenue: turning points, underperforming products and regions.",
  "continue.decline.p1": "Compare monthly revenue trends to locate the turning point",
  "continue.decline.p2": "Identify the product lines and regions driving the decline",
  "continue.decline.p3": "Prioritize a checklist of anomalies to investigate",
  "continue.customerRisk.desc": "Assess customer concentration and churn risk, and identify the customers with the biggest revenue impact.",
  "continue.customerRisk.p1": "Calculate the revenue share and concentration of the top 10 customers",
  "continue.customerRisk.p2": "Flag customers with declining purchase frequency or shrinking spend",
  "continue.customerRisk.p3": "Output a customer health tier and risk alerts",
  "continue.product.desc": "Break down product and category performance to find drags and growth opportunities.",
  "continue.product.p1": "Compare revenue, volume and share by product line",
  "continue.product.p2": "Identify declining and high-growth products",
  "continue.product.p3": "Suggest portfolio optimization actions",
  "continue.regional.desc": "Analyze regional performance differences to spot market risks and expansion opportunities.",
  "continue.regional.p1": "Compare revenue trends and growth rates by region",
  "continue.regional.p2": "Flag declining regions and over-reliance on single markets",
  "continue.regional.p3": "Output regional strategy recommendations",
  "continue.manager.desc": "Actionable guidance for sales managers based on the data.",
  "continue.manager.p1": "Surface the 3 most important signals for the management team",
  "continue.manager.p2": "Rank improvement actions by priority",
  "continue.manager.p3": "Provide key discussion points for the review meeting",
  "history.title": "Analysis History",
  "history.session": "Stored in this browser session only",
  "history.initial": "Initial Analysis",
  "history.followUp": "Follow-up Analysis",
  "history.recommended": "Recommended Actions",
  "history.empty": "No analysis in this session yet",
  "actions.title": "Recommended Actions",
  "actions.high": "High Priority",
  "actions.medium": "Medium Priority",
  "actions.low": "Low Priority",
  "actions.empty": "No recommended actions available",

};

const ja: TranslationDict = {
  "nav.sales": "\u58f2\u4e0a\u5206\u6790",
  "nav.finance": "\u8ca1\u52d9\u5206\u6790",
  "nav.inventory": "\u5728\u5eab\u5206\u6790",
  "nav.hr": "\u4eba\u4e8b",
  "nav.energy": "\u30a8\u30cd\u30eb\u30ae\u30fc\u5206\u6790",
  "nav.procurement": "\u8abf\u9054\u5206\u6790",
  "nav.custom": "\u30ab\u30b9\u30bf\u30e0",
  "nav.comingSoon": "\u8fd1\u65e5\u516c\u958b",

  "header.title": "ExcelPilot",
  "header.tagline": "AI Excel \u5206\u6790\u30d7\u30e9\u30c3\u30c8\u30d5\u30a9\u30fc\u30e0",
  "header.version": "v0.2 Beta",
  "header.online": "\u30d0\u30c3\u30af\u30a8\u30f3\u30c9\u63a5\u7d9a\u6e08",
  "header.offline": "\u30d0\u30c3\u30af\u30a8\u30f3\u30c9\u30aa\u30d5\u30e9\u30a4\u30f3",
  "header.checking": "\u78ba\u8a8d\u4e2d...",

  "lang.uiLabel": "UI\u8a00\u8a9e",
  "lang.reportLabel": "\u30ec\u30dd\u30fc\u30c8\u8a00\u8a9e",
  "lang.followUI": "UI\u8a00\u8a9e\u306b\u5f93\u3046",

  "step1.title": "Excel\u30d5\u30a1\u30a4\u30eb\u3092\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9",
  "step1.desc": "\u5206\u6790\u3059\u308b .xlsx \u307e\u305f\u306f .xls \u30d5\u30a1\u30a4\u30eb\u3092\u9078\u629e",
  "step1.dragHint": "Excel\u30d5\u30a1\u30a4\u30eb\u3092\u30c9\u30e9\u30c3\u30b0\u3059\u308b\u304b\u3001\u30af\u30ea\u30c3\u30af\u3057\u3066\u53c2\u7167",
  "step1.fileTypes": ".xlsx\u3001.xls\u306b\u5bfe\u5fdc\u3001\u6700\u592720MB",
  "step1.browse": "\u30d5\u30a1\u30a4\u30eb\u3092\u53c2\u7167",
  "step1.uploadBtn": "\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u3068\u5206\u6790",
  "step1.uploading": "\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u4e2d...",

  "step2.processing": "\u30c7\u30fc\u30bf\u3092\u51e6\u7406\u4e2d...",
  "step2.title": "\u30c7\u30fc\u30bf\u691c\u8a3c",
  "step2.desc": "\u30d5\u30a1\u30a4\u30eb\u306e\u51e6\u7406\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f",
  "step2.uploaded": "\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u6e08",
  "step2.worksheet": "\u30ef\u30fc\u30af\u30b7\u30fc\u30c8",
  "step2.dataRows": "\u30c7\u30fc\u30bf\u884c",
  "step2.columns": "\u5217",

  "step3.title": "AI\u5206\u6790",
  "step3.desc": "\u58f2\u4e0a\u30c7\u30fc\u30bf\u3092\u5206\u6790",
  "step3.analyze": "\u58f2\u4e0a\u30c7\u30fc\u30bf\u3092\u5206\u6790",
  "step3.analyzing": "AI\u5206\u6790\u4e2d...",

  "report.title": "\u5206\u6790\u30ec\u30dd\u30fc\u30c8",
  "report.desc": "AI\u304c\u751f\u6210\u3057\u305f\u30d3\u30b8\u30cd\u30b9\u30a4\u30f3\u30b5\u30a4\u30c8",
  "report.salesIntel": "\u58f2\u4e0a\u30a4\u30f3\u30c6\u30ea\u30b8\u30a7\u30f3\u30b9",
  "report.aiGenerated": "AI\u751f\u6210",
  "report.execSummary": "\u30a8\u30b0\u30bc\u30af\u30c6\u30a3\u30d6\u30b5\u30de\u30ea\u30fc",
  "report.keyFindings": "\u4e3b\u8981\u306a\u767a\u898b",
  "report.insightsFound": "{n}\u4ef6\u306e\u30a4\u30f3\u30b5\u30a4\u30c8",
  "report.riskAnalysis": "\u30ea\u30b9\u30af\u5206\u6790",
  "report.risksFound": "{n}\u4ef6\u306e\u30ea\u30b9\u30af\u3092\u691c\u51fa",
  "report.recommendations": "\u63a8\u5968",
  "report.actionable": "\u5b9f\u884c\u53ef\u80fd\u306a\u6b21\u306e\u30b9\u30c6\u30c3\u30d7",
  "report.kpi.rows": "\u30c7\u30fc\u30bf\u884c",
  "report.kpi.findings": "\u767a\u898b",
  "report.kpi.risks": "\u30ea\u30b9\u30af",
  "report.kpi.suggestions": "\u63d0\u6848",
  "report.footer.completed": "AI\u5206\u6790\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f",
  "report.footer.analysisTime": "\u5206\u6790\u6642\u9593",
  "report.footer.dataSize": "\u30c7\u30fc\u30bf\u30b5\u30a4\u30ba",
  "report.footer.generated": "\u30ec\u30dd\u30fc\u30c8\u751f\u6210",
  "report.footer.rows": "\u884c",
  "report.multiLang": "\u30bd\u30fc\u30b9\u30c7\u30fc\u30bf\u306b\u8907\u6570\u306e\u8a00\u8a9e\u304c\u691c\u51fa\u3055\u308c\u307e\u3057\u305f\u3002",

  "recs.title": "\u63a8\u5968\u3055\u308c\u308b\u6b21\u306e\u5206\u6790",
  "chat.title": "\u5206\u6790\u3092\u7d9a\u3051\u308b",
  "chat.desc": "\u73fe\u5728\u306e\u30ec\u30dd\u30fc\u30c8\u306b\u57fa\u3065\u3044\u3066\u8cea\u554f\u3092\u7d9a\u3051\u308b",
  "chat.placeholder": "\u30c7\u30fc\u30bf\u3092\u3055\u3089\u306b\u5206\u6790\u3059\u308b\u305f\u3081\u306e\u8cea\u554f\u3092\u5165\u529b...",
  "chat.inputPlaceholder": "\u8cea\u554f\u3092\u5165\u529b...",
  "chat.send": "\u9001\u4fe1",
  "chat.thinking": "AI\u601d\u8003\u4e2d...",
  "chat.error": "\u7533\u3057\u8a33\u3042\u308a\u307e\u305b\u3093\u3001\u5fdc\u7b54\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u518d\u8a66\u884c\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  "chat.advancedInput": "+ \u30ab\u30b9\u30bf\u30e0\u8cea\u554f",

  "ws.actions": "Recommended Actions",
  "ws.actionsDesc": "\u884c\u52a8\u8ba1\u5212\uff08\u672a\u6765\u7248\u672c\u63a8\u51fa\uff09",
  "ws.optPortfolio": "\u4f18\u5316\u4ea7\u54c1\u7ec4\u5408",
  "ws.optPortfolioDesc": "\u4ea7\u54c1\u6df7\u5408\u5206\u6790",
  "ws.regionalStrat": "\u533a\u57df\u7b56\u7565",
  "ws.regionalStratDesc": "\u5e02\u573a\u6269\u5c55\u8ba1\u5212",
  "ws.revForecast": "\u6536\u5165\u9884\u6d4b",
  "ws.revForecastDesc": "\u9884\u6d4b\u5efa\u6a21",
  "error.uploadFailed": "\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002",
  "error.processingFailed": "\u51e6\u7406\u306b\u5931\u6557\u3057\u307e\u3057\u305f",
  "error.analysisFailed": "\u5206\u6790\u306b\u5931\u6557\u3057\u307e\u3057\u305f",
  "error.generic": "\u64cd\u4f5c\u306b\u5931\u6557\u3057\u307e\u3057\u305f",
  "beta.badge": "\u30d9\u30fc\u30bf",
  "beta.version": "\u30d0\u30fc\u30b8\u30e7\u30f3",
  "beta.message": "ExcelPilot \u306e\u6539\u5584\u306b\u3054\u5354\u529b\u3044\u305f\u3060\u304d\u3042\u308a\u304c\u3068\u3046\u3054\u3056\u3044\u307e\u3059\u3002\u7686\u69d8\u306e\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af\u304c\u4eca\u5f8c\u306e\u30ea\u30ea\u30fc\u30b9\u3092\u5f62\u4f5c\u308a\u307e\u3059\u3002",
  "timeline.title": "\u5206\u6790\u306e\u9032\u884c\u72b6\u6cc1",
  "timeline.uploading": "\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9\u4e2d",
  "timeline.parsing": "\u30ef\u30fc\u30af\u30d6\u30c3\u30af\u3092\u89e3\u6790\u4e2d",
  "timeline.detecting": "\u30c7\u30fc\u30bf\u578b\u3092\u691c\u51fa\u4e2d",
  "timeline.thinking": "AI \u304c\u601d\u8003\u4e2d",
  "timeline.generating": "\u30d3\u30b8\u30cd\u30b9\u30a4\u30f3\u30b5\u30a4\u30c8\u3092\u69cb\u7bc9\u4e2d",
  "timeline.inProgress": "\u51e6\u7406\u4e2d...",
  "timeline.failed": "\u5931\u6557",
  "feedback.button": "\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af",
  "feedback.title": "\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af\u3092\u9001\u4fe1",
  "feedback.subtitle": "ExcelPilot \u306e\u6539\u5584\u306b\u3054\u5354\u529b\u304f\u3060\u3055\u3044",
  "feedback.bug": "\u30d0\u30b0\u5831\u544a",
  "feedback.feature": "\u6a5f\u80fd\u30ea\u30af\u30a8\u30b9\u30c8",
  "feedback.suggestion": "\u63d0\u6848",
  "feedback.bugDesc": "\u30a8\u30e9\u30fc\u3084\u4e88\u671f\u3057\u306a\u3044\u52d5\u4f5c\u3092\u5831\u544a",
  "feedback.featureDesc": "\u65b0\u6a5f\u80fd\u3092\u30ea\u30af\u30a8\u30b9\u30c8",
  "feedback.suggestionDesc": "\u6539\u5584\u30a2\u30a4\u30c7\u30a2\u3092\u5171\u6709",
  "feedback.titleLabel": "\u30bf\u30a4\u30c8\u30eb",
  "feedback.descLabel": "\u8a73\u7d30",
  "feedback.titlePlaceholder": "\u554f\u984c\u3084\u30a2\u30a4\u30c7\u30a2\u3092\u7c21\u5358\u306b\u8aac\u660e",
  "feedback.descPlaceholder": "\u8a73\u7d30\u3084\u518d\u73fe\u624b\u9806\u306a\u3069\u3092\u8ffd\u52a0",
  "feedback.submit": "\u9001\u4fe1",
  "feedback.cancel": "\u30ad\u30e3\u30f3\u30bb\u30eb",
  "feedback.back": "\u623b\u308b",
  "feedback.hint": "\u9001\u4fe1\u3059\u308b\u3068\u30e1\u30fc\u30eb\u30a2\u30d7\u30ea\u304c\u958b\u304d\u307e\u3059",
  "feedback.thanks": "\u30d5\u30a3\u30fc\u30c9\u30d0\u30c3\u30af\u3042\u308a\u304c\u3068\u3046\u3054\u3056\u3044\u307e\u3059\uff01",
  "journey.title": "\u5206\u6790\u30b8\u30e3\u30fc\u30cb\u30fc",
  "journey.upload": "\u30a2\u30c3\u30d7\u30ed\u30fc\u30c9",
  "journey.aiAnalysis": "AI\u5206\u6790",
  "journey.businessInsight": "\u30d3\u30b8\u30cd\u30b9\u30a4\u30f3\u30b5\u30a4\u30c8",
  "journey.continueAnalysis": "\u5206\u6790\u3092\u7d9a\u3051\u308b",
  "journey.recommendedActions": "\u63a8\u5968\u30a2\u30af\u30b7\u30e7\u30f3",
  "continue.title": "\u5206\u6790\u3092\u7d9a\u3051\u308b",
  "continue.subtitle": "\u65b9\u5411\u3092\u9078\u629e\u3057\u3066\u8a73\u7d30\u5206\u6790\uff08v1\u306f\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\uff09",
  "continue.selectHint": "\u65b9\u5411\u3092\u30af\u30ea\u30c3\u30af\u3057\u3066\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u3092\u8868\u793a",
  "continue.templateNote": "\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u5206\u6790 \u00b7 AI\u30d5\u30a9\u30ed\u30fc\u30a2\u30c3\u30d7\u306f\u8fd1\u65e5\u516c\u958b",
  "continue.decline": "\u58f2\u4e0a\u6e1b\u5c11\u306e\u539f\u56e0\u306f\uff1f",
  "continue.customerRisk": "\u9867\u5ba2\u30ea\u30b9\u30af\u5206\u6790",
  "continue.product": "\u88fd\u54c1\u30d1\u30d5\u30a9\u30fc\u30de\u30f3\u30b9",
  "continue.regional": "\u5730\u57df\u30d1\u30d5\u30a9\u30fc\u30de\u30f3\u30b9",
  "continue.manager": "\u30bb\u30fc\u30eb\u30b9\u30de\u30cd\u30fc\u30b8\u30e3\u30fc\u63d0\u6848",
  "continue.decline.desc": "\u58f2\u4e0a\u6e1b\u5c11\u306e\u6839\u672c\u539f\u56e0\u306b\u7740\u76ee\uff1a\u8ee2\u63db\u70b9\u3001\u4f4e\u8ff7\u3057\u3066\u3044\u308b\u88fd\u54c1\u3068\u5730\u57df\u3002",
  "continue.decline.p1": "\u6708\u6b21\u58f2\u4e0a\u30c8\u30ec\u30f3\u30c9\u3092\u6bd4\u8f03\u3057\u3001\u6e1b\u5c11\u304c\u59cb\u307e\u3063\u305f\u6642\u70b9\u3092\u7279\u5b9a",
  "continue.decline.p2": "\u6e1b\u5c11\u306e\u4e3b\u56e0\u3068\u306a\u308b\u88fd\u54c1\u30e9\u30a4\u30f3\u3068\u5730\u57df\u3092\u7279\u5b9a",
  "continue.decline.p3": "\u8abf\u67fb\u3059\u3079\u304d\u7570\u5e38\u30c7\u30fc\u30bf\u306e\u512a\u5148\u9806\u4f4d\u30ea\u30b9\u30c8\u3092\u4f5c\u6210",
  "continue.customerRisk.desc": "\u9867\u5ba2\u96c6\u4e2d\u5ea6\u3068\u96e2\u8131\u30ea\u30b9\u30af\u3092\u8a55\u4fa1\u3057\u3001\u53ce\u76ca\u3078\u306e\u5f71\u97ff\u304c\u5927\u304d\u3044\u9867\u5ba2\u3092\u7279\u5b9a\u3057\u307e\u3059\u3002",
  "continue.customerRisk.p1": "\u4e0a\u4f4d10\u793e\u306e\u58f2\u4e0a\u30b7\u30a7\u30a2\u3068\u96c6\u4e2d\u5ea6\u3092\u8a08\u7b97",
  "continue.customerRisk.p2": "\u8cfc\u5165\u983b\u5ea6\u306e\u4f4e\u4e0b\u3084\u91d1\u984d\u6e1b\u5c11\u304c\u307f\u3089\u308c\u308b\u9867\u5ba2\u3092\u7279\u5b9a",
  "continue.customerRisk.p3": "\u9867\u5ba2\u30d8\u30eb\u30b9\u5c64\u3068\u30ea\u30b9\u30af\u30a2\u30e9\u30fc\u30c8\u3092\u51fa\u529b",
  "continue.product.desc": "\u88fd\u54c1\u30fb\u30ab\u30c6\u30b4\u30ea\u5225\u306e\u30d1\u30d5\u30a9\u30fc\u30de\u30f3\u30b9\u3092\u5206\u89e3\u3057\u3001\u4f4e\u8ff7\u8981\u56e0\u3068\u6210\u9577\u6a5f\u4f1a\u3092\u767a\u898b\u3057\u307e\u3059\u3002",
  "continue.product.p1": "\u88fd\u54c1\u30e9\u30a4\u30f3\u5225\u306b\u58f2\u4e0a\u30fb\u6570\u91cf\u30fb\u69cb\u6210\u6bd4\u3092\u6bd4\u8f03",
  "continue.product.p2": "\u4f4e\u8ff7\u88fd\u54c1\u3068\u9ad8\u6210\u9577\u88fd\u54c1\u3092\u7279\u5b9a",
  "continue.product.p3": "\u30dd\u30fc\u30c8\u30d5\u30a9\u30ea\u30aa\u6700\u9069\u5316\u306e\u63d0\u6848",
  "continue.regional.desc": "\u5730\u57df\u5225\u306e\u696d\u7e3e\u5dee\u3092\u5206\u6790\u3057\u3001\u5e02\u5834\u30ea\u30b9\u30af\u3068\u62e1\u5927\u6a5f\u4f1a\u3092\u7279\u5b9a\u3057\u307e\u3059\u3002",
  "continue.regional.p1": "\u5730\u57df\u5225\u306b\u58f2\u4e0a\u30c8\u30ec\u30f3\u30c9\u3068\u6210\u9577\u7387\u3092\u6bd4\u8f03",
  "continue.regional.p2": "\u4f4e\u8ff7\u5730\u57df\u3068\u5358\u4e00\u5e02\u5834\u3078\u306e\u904e\u5ea6\u306a\u4f9d\u5b58\u3092\u8b66\u544a",
  "continue.regional.p3": "\u5730\u57df\u6226\u7565\u306e\u63d0\u6848\u3092\u51fa\u529b",
  "continue.manager.desc": "\u30c7\u30fc\u30bf\u306b\u57fa\u3065\u304f\u30bb\u30fc\u30eb\u30b9\u30de\u30cd\u30fc\u30b8\u30e3\u30fc\u5411\u3051\u306e\u5b9f\u8df5\u7684\u306a\u30a2\u30c9\u30d0\u30a4\u30b9\u3002",
  "continue.manager.p1": "\u7ba1\u7406\u30c1\u30fc\u30e0\u306b\u3068\u3063\u3066\u91cd\u8981\u306a\u30b7\u30b0\u30ca\u30eb\u30923\u3064\u62bd\u51fa",
  "continue.manager.p2": "\u6539\u5584\u30a2\u30af\u30b7\u30e7\u30f3\u3092\u512a\u5148\u5ea6\u9806\u306b\u6574\u7406",
  "continue.manager.p3": "\u30ec\u30d3\u30e5\u30fc\u4f1a\u8b70\u306e\u4e3b\u8981\u306a\u8ad6\u70b9\u3092\u63d0\u793a",
  "history.title": "\u5206\u6790\u5c65\u6b74",
  "history.session": "\u3053\u306e\u30d6\u30e9\u30a6\u30b6\u30bb\u30c3\u30b7\u30e7\u30f3\u306e\u307f\u306b\u4fdd\u5b58",
  "history.initial": "\u521d\u671f\u5206\u6790",
  "history.followUp": "\u30d5\u30a9\u30ed\u30fc\u30a2\u30c3\u30d7\u5206\u6790",
  "history.recommended": "\u63a8\u5968\u30a2\u30af\u30b7\u30e7\u30f3",
  "history.empty": "\u3053\u306e\u30bb\u30c3\u30b7\u30e7\u30f3\u306b\u306f\u307e\u3060\u5206\u6790\u304c\u3042\u308a\u307e\u305b\u3093",
  "actions.title": "\u63a8\u5968\u30a2\u30af\u30b7\u30e7\u30f3",
  "actions.high": "\u9ad8\u512a\u5148\u5ea6",
  "actions.medium": "\u4e2d\u512a\u5148\u5ea6",
  "actions.low": "\u4f4e\u512a\u5148\u5ea6",
  "actions.empty": "\u5229\u7528\u53ef\u80fd\u306a\u63a8\u5968\u30a2\u30af\u30b7\u30e7\u30f3\u306f\u3042\u308a\u307e\u305b\u3093",

};

const de: TranslationDict = {
  "nav.sales": "Vertrieb",
  "nav.finance": "Finanzen",
  "nav.inventory": "Inventar",
  "nav.hr": "Personal",
  "nav.energy": "Energie",
  "nav.procurement": "Einkauf",
  "nav.custom": "Benutzerdefiniert",
  "nav.comingSoon": "Demn\u00e4chst",

  "header.title": "ExcelPilot",
  "header.tagline": "KI Excel Analyseplattform",
  "header.version": "v0.2 Beta",
  "header.online": "Backend Online",
  "header.offline": "Backend Offline",
  "header.checking": "Pr\u00fcfung...",

  "lang.uiLabel": "UI-Sprache",
  "lang.reportLabel": "Berichtssprache",
  "lang.followUI": "UI-Sprache \u00fcbernehmen",

  "step1.title": "Excel-Datei hochladen",
  "step1.desc": "W\u00e4hlen Sie eine .xlsx- oder .xls-Datei zur Analyse",
  "step1.dragHint": "Ziehen Sie Ihre Excel-Datei hierher oder klicken Sie zum Durchsuchen",
  "step1.fileTypes": "Unterst\u00fctzt .xlsx und .xls bis 20 MB",
  "step1.browse": "Dateien durchsuchen",
  "step1.uploadBtn": "Hochladen & Analysieren",
  "step1.uploading": "Wird hochgeladen...",

  "step2.processing": "Daten werden verarbeitet...",
  "step2.title": "Datenvalidierung",
  "step2.desc": "Datei erfolgreich verarbeitet",
  "step2.uploaded": "Hochgeladen",
  "step2.worksheet": "Arbeitsblatt",
  "step2.dataRows": "Datenzeilen",
  "step2.columns": "Spalten",

  "step3.title": "KI-Analyse",
  "step3.desc": "Vertriebsanalyse f\u00fcr Ihre Daten ausf\u00fchren",
  "step3.analyze": "Vertriebsdaten analysieren",
  "step3.analyzing": "KI analysiert...",

  "report.title": "Analysebericht",
  "report.desc": "KI-generierte Gesch\u00e4ftseinblicke",
  "report.salesIntel": "Vertriebsanalyse",
  "report.aiGenerated": "KI-generiert",
  "report.execSummary": "Zusammenfassung",
  "report.keyFindings": "Wichtige Erkenntnisse",
  "report.insightsFound": "{n} Erkenntnisse entdeckt",
  "report.riskAnalysis": "Risikoanalyse",
  "report.risksFound": "{n} Risiken identifiziert",
  "report.recommendations": "Empfehlungen",
  "report.actionable": "Umsetzbare n\u00e4chste Schritte",
  "report.kpi.rows": "Datenzeilen",
  "report.kpi.findings": "Erkenntnisse",
  "report.kpi.risks": "Risiken",
  "report.kpi.suggestions": "Vorschl\u00e4ge",
  "report.footer.completed": "KI-Analyse abgeschlossen",
  "report.footer.analysisTime": "Analysezeit",
  "report.footer.dataSize": "Datengr\u00f6\u00dfe",
  "report.footer.generated": "Bericht erstellt",
  "report.footer.rows": "Zeilen",
  "report.multiLang": "Mehrere Sprachen in den Quelldaten erkannt.",

  "recs.title": "Empfohlene n\u00e4chste Analyse",
  "chat.title": "Analyse fortsetzen",
  "chat.desc": "Stellen Sie Folgefragen basierend auf dem aktuellen Bericht",
  "chat.placeholder": "Stellen Sie eine Frage, um tiefer in die Daten einzutauchen...",
  "chat.inputPlaceholder": "Ihre Frage eingeben...",
  "chat.send": "Senden",
  "chat.thinking": "KI denkt nach...",
  "chat.error": "Entschuldigung, Antwort fehlgeschlagen. Bitte versuchen Sie es erneut.",
  "chat.advancedInput": "+ Eigene Frage",

  "ws.actions": "Recommended Actions",
  "ws.actionsDesc": "\u884c\u52a8\u8ba1\u5212\uff08\u672a\u6765\u7248\u672c\u63a8\u51fa\uff09",
  "ws.optPortfolio": "\u4f18\u5316\u4ea7\u54c1\u7ec4\u5408",
  "ws.optPortfolioDesc": "\u4ea7\u54c1\u6df7\u5408\u5206\u6790",
  "ws.regionalStrat": "\u533a\u57df\u7b56\u7565",
  "ws.regionalStratDesc": "\u5e02\u573a\u6269\u5c55\u8ba1\u5212",
  "ws.revForecast": "\u6536\u5165\u9884\u6d4b",
  "ws.revForecastDesc": "\u9884\u6d4b\u5efa\u6a21",
  "error.uploadFailed": "Upload fehlgeschlagen.",
  "error.processingFailed": "Verarbeitung fehlgeschlagen",
  "error.analysisFailed": "Analyse fehlgeschlagen",
  "error.generic": "Vorgang fehlgeschlagen",
  "beta.badge": "Beta",
  "beta.version": "Version",
  "beta.message": "Vielen Dank, dass Sie helfen, ExcelPilot zu verbessern. Ihr Feedback pr\u00e4gt direkt zuk\u00fcnftige Versionen.",
  "timeline.title": "Analysefortschritt",
  "timeline.uploading": "Hochladen",
  "timeline.parsing": "Arbeitsmappe wird geparst",
  "timeline.detecting": "Datentypen werden erkannt",
  "timeline.thinking": "KI denkt nach",
  "timeline.generating": "Business-Insights werden erstellt",
  "timeline.inProgress": "L\u00e4uft...",
  "timeline.failed": "Fehlgeschlagen",
  "feedback.button": "Feedback",
  "feedback.title": "Feedback senden",
  "feedback.subtitle": "Helfen Sie uns, ExcelPilot zu verbessern",
  "feedback.bug": "Fehler melden",
  "feedback.feature": "Funktion anfragen",
  "feedback.suggestion": "Vorschlag",
  "feedback.bugDesc": "Einen Fehler oder unerwartetes Verhalten melden",
  "feedback.featureDesc": "Eine neue Funktion anfragen",
  "feedback.suggestionDesc": "Eine Verbesserung vorschlagen",
  "feedback.titleLabel": "Titel",
  "feedback.descLabel": "Beschreibung",
  "feedback.titlePlaceholder": "Problem oder Idee kurz beschreiben",
  "feedback.descPlaceholder": "Details, Reproduktionsschritte usw.",
  "feedback.submit": "Feedback senden",
  "feedback.cancel": "Abbrechen",
  "feedback.back": "Zur\u00fcck",
  "feedback.hint": "Beim Senden wird Ihr E-Mail-Programm ge\u00f6ffnet",
  "feedback.thanks": "Vielen Dank! Wir verbessern das Produkt kontinuierlich.",
  "journey.title": "Business-Insight-Reise",
  "journey.upload": "Hochladen",
  "journey.aiAnalysis": "KI-Analyse",
  "journey.businessInsight": "Business Insights",
  "journey.continueAnalysis": "Analyse fortsetzen",
  "journey.recommendedActions": "Empfohlene Ma\u00dfnahmen",
  "continue.title": "Analyse fortsetzen",
  "continue.subtitle": "W\u00e4hlen Sie einen Bereich f\u00fcr tiefere Analysen (v1: Vorlagen)",
  "continue.selectHint": "Bereich ausw\u00e4hlen, um die Vorlage zu sehen",
  "continue.templateNote": "Vorlagenanalyse \u00b7 KI-Follow-up folgt in K\u00fcrze",
  "continue.decline": "Warum sind die Ums\u00e4tze gesunken?",
  "continue.customerRisk": "Kundenrisikoanalyse",
  "continue.product": "Produktperformance",
  "continue.regional": "Regionalperformance",
  "continue.manager": "Vorschl\u00e4ge f\u00fcr Vertriebsleiter",
  "continue.decline.desc": "Fokus auf die Ursachen des Umsatzr\u00fcckgangs: Wendepunkte, schwache Produkte und Regionen.",
  "continue.decline.p1": "Monatliche Umsatztrends vergleichen, um den Wendepunkt zu lokalisieren",
  "continue.decline.p2": "Produktlinien und Regionen identifizieren, die den R\u00fcckgang verursachen",
  "continue.decline.p3": "Eine priorisierte Checkliste der zu untersuchenden Anomalien erstellen",
  "continue.customerRisk.desc": "Konzentration und Abwanderungsrisiko der Kunden bewerten und die umsatzrelevantesten Kunden identifizieren.",
  "continue.customerRisk.p1": "Umsatzanteil und Konzentration der Top-10-Kunden berechnen",
  "continue.customerRisk.p2": "Kunden mit sinkender Kaufh\u00e4ufigkeit oder schrumpfenden Ausgaben markieren",
  "continue.customerRisk.p3": "Kundengesundheitsstufen und Risikowarnungen ausgeben",
  "continue.product.desc": "Produkt- und Kategorie-Performance aufschl\u00fcsseln, um Schw\u00e4chen und Wachstumschancen zu finden.",
  "continue.product.p1": "Umsatz, Menge und Anteil je Produktlinie vergleichen",
  "continue.product.p2": "Schwache und stark wachsende Produkte identifizieren",
  "continue.product.p3": "Ma\u00dfnahmen zur Portfolio-Optimierung vorschlagen",
  "continue.regional.desc": "Regionale Leistungsunterschiede analysieren, um Marktrisiken und Expansionschancen zu erkennen.",
  "continue.regional.p1": "Umsatztrends und Wachstumsraten je Region vergleichen",
  "continue.regional.p2": "Schwache Regionen und \u00fcberm\u00e4\u00dfige Abh\u00e4ngigkeit von einzelnen M\u00e4rkten markieren",
  "continue.regional.p3": "Empfehlungen f\u00fcr die Regionalstrategie ausgeben",
  "continue.manager.desc": "Praxisnahe Handlungsempfehlungen f\u00fcr Vertriebsleiter auf Basis der Daten.",
  "continue.manager.p1": "Die 3 wichtigsten Signale f\u00fcr das Management herausarbeiten",
  "continue.manager.p2": "Verbesserungsma\u00dfnahmen nach Priorit\u00e4t ordnen",
  "continue.manager.p3": "Kernpunkte f\u00fcr das Review-Meeting bereitstellen",
  "history.title": "Analyseverlauf",
  "history.session": "Nur in dieser Browser-Sitzung gespeichert",
  "history.initial": "Erste Analyse",
  "history.followUp": "Folgeanalyse",
  "history.recommended": "Empfohlene Ma\u00dfnahmen",
  "history.empty": "Noch keine Analyse in dieser Sitzung",
  "actions.title": "Empfohlene Ma\u00dfnahmen",
  "actions.high": "Hohe Priorit\u00e4t",
  "actions.medium": "Mittlere Priorit\u00e4t",
  "actions.low": "Niedrige Priorit\u00e4t",
  "actions.empty": "Keine empfohlenen Ma\u00dfnahmen verf\u00fcgbar",

};

const dictionaries: Record<UILanguage, TranslationDict> = { zh, en, ja, de };

export function t(lang: UILanguage, key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[lang] || dictionaries.en;
  let text = dict[key];
  if (text === undefined) {
    text = dictionaries.en[key];
    if (text === undefined) return key;
  }
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}

export function getReportLang(uiLang: UILanguage, reportLang: ReportLanguage): string {
  if (reportLang === "follow") return uiLang;
  return reportLang;
}
// ── Language detection (M2.3) ──────────────────────────────────────────────

export const UI_LANG_STORAGE_KEY = "excelpilot_ui_lang";
export const UI_LANG_DETECT_COOKIE = "excelpilot_ui_lang_detect";

const UI_LANG_SET: ReadonlySet<string> = new Set(SUPPORTED_UI_LANGS);

export function isUILanguage(value: string | null | undefined): value is UILanguage {
  return typeof value === "string" && (UI_LANG_SET as ReadonlySet<string>).has(value);
}

/** Map a browser language tag (navigator.language / Accept-Language) to a supported UI language. */
export function browserToLang(language: string | null | undefined): UILanguage | null {
  if (!language) return null;
  const tag = language.toLowerCase();
  if (tag === "zh" || tag.startsWith("zh-")) return "zh";
  if (tag === "ja" || tag.startsWith("ja-")) return "ja";
  if (tag === "de" || tag.startsWith("de-")) return "de";
  if (tag === "en" || tag.startsWith("en-")) return "en";
  return null;
}

/** Map an IP country code (ISO 3166-1 alpha-2) to a supported UI language. Unknown -> en. */
export function countryToLang(country: string | null | undefined): UILanguage {
  const c = (country || "").trim().toUpperCase();
  if (c === "CN" || c === "TW" || c === "HK" || c === "MO") return "zh";
  if (c === "JP") return "ja";
  if (c === "DE" || c === "AT") return "de";
  return "en";
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = name + "=";
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
  }
  return null;
}

/**
 * Resolve the UI language for the current browser:
 * 1. localStorage (user manual choice, highest priority)
 * 2. navigator.language (browser language; IP must NOT override it)
 * 3. excelpilot_ui_lang_detect cookie (IP country inferred by Edge middleware)
 * 4. "zh" (product default)
 */
export function resolveInitialUiLang(): UILanguage {
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(UI_LANG_STORAGE_KEY);
      if (isUILanguage(saved)) return saved;
    } catch { /* ignore */ }
  }
  if (typeof navigator !== "undefined") {
    const browserLang = browserToLang(navigator.language);
    if (browserLang) return browserLang;
  }
  const detected = readCookie(UI_LANG_DETECT_COOKIE);
  if (isUILanguage(detected)) return detected;
  return "zh";
}

/** Persist a manual language choice: localStorage (source of truth) + cookie + <html lang>. */
export function persistUiLang(lang: UILanguage): void {
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(UI_LANG_STORAGE_KEY, lang); } catch { /* ignore */ }
  }
  if (typeof document !== "undefined") {
    try {
      document.cookie = `${UI_LANG_DETECT_COOKIE}=${encodeURIComponent(lang)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      document.documentElement.lang = lang;
    } catch { /* ignore */ }
  }
}