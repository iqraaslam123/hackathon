Build Failed
Command "npm run build" exited with 1

src/app/api/tickets/route.ts(76,18): error TS2339: Property '_id' does not exist on type 'never'.
src/app/api/tickets/route.ts(92,11): error TS2769: No overload matches this call.
  The last overload gave the following error.
    Type 'string' is not assignable to type 'RegExp | "Billing" | "Account Access" | "Technical Support" | "Order & Shipping" | "Product Info" | "General Inquiry" | "Other" | undefined'.
src/app/api/tickets/route.ts(100,47): error TS2339: Property '_id' does not exist on type 'never'.
src/app/api/tickets/route.ts(102,22): error TS2339: Property '_id' does not exist on type 'never'.
src/app/api/tickets/route.ts(107,22): error TS2339: Property '_id' does not exist on type 'never'.
src/app/login/page.tsx(34,9): error TS2322: Type '"admin@supportflow.app" | "agent@supportflow.app" | "demo@supportflow.app"' is not assignable to type '"demo@supportflow.app"'.
  Type '"admin@supportflow.app"' is not assignable to type '"demo@supportflow.app"'.
src/app/login/page.tsx(143,47): error TS2322: Type 'string' is not assignable to type '"demo@supportflow.app"'.
src/components/chat/ChatBot.tsx(91,23): error TS18046: 'SR' is of type 'unknown'.
src/components/dashboard/AgentDashboard.tsx(175,58): error TS2339: Property 'message' does not exist on type '{ triage: { category: string; priority: string; summary: string; }; ticket: TicketDTO; }'.
Failed to type check.
Error: Command "npm run build" exited with 1
