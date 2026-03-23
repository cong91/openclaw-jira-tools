export function getSessionKey(ctx) {
    return String(ctx?.sessionKey ||
        ctx?.session?.key ||
        ctx?.session?.sessionKey ||
        ctx?.meta?.sessionKey ||
        "main");
}
export function parseSessionIdentity(sessionKey) {
    const parts = sessionKey.split(":");
    if (parts.length >= 5 && parts[0] === "agent") {
        return { agentId: parts[1] || "main", userId: parts[4] || "main" };
    }
    return { agentId: "main", userId: sessionKey || "main" };
}
export function createToolResult(text, isError = false) {
    return {
        content: [{ type: "text", text }],
        details: { toolResult: { text } },
        isError,
    };
}
