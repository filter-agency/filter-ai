
export const getTransformedPrompt = (
    basePrompt: string,
    settings: any,
    optionKey: string, // e.g. "stop_words_enabled" or "brand_voice_enabled"
    promptKey: string  // e.g. "stop_words_prompt" or "brand_voice_prompt"
)=> {

    if (!settings) {
        console.log('[Settings Missing] Using raw prompt:', basePrompt);
        return basePrompt;
    }

    const isEnabled = settings[optionKey];
    const extraPrompt = settings[promptKey]?.trim();

    if (!extraPrompt) {
        console.warn(`[${promptKey} Missing] Using raw prompt:`, basePrompt);
        return basePrompt;
    }

    return isEnabled ? `${basePrompt}\n\n${extraPrompt}` : basePrompt;
}