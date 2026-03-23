export declare function getSessionKey(ctx: any): string;
export declare function parseSessionIdentity(sessionKey: string): {
    agentId: string;
    userId: string;
};
export declare function createToolResult(text: string, isError?: boolean): {
    content: {
        type: "text";
        text: string;
    }[];
    details: {
        toolResult: {
            text: string;
        };
    };
    isError: boolean;
};
