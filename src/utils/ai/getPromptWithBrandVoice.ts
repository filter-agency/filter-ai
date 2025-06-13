export const getPromptWithBrandVoice = (
    rawPrompt: string,
    settings,
)=> {

    if (!settings) {
        console.log('[Settings Missing] Using raw prompt:', rawPrompt);
        return rawPrompt;
    }

    const brandVoiceEnabled = settings.brand_voice_enabled;

    const brandVoicePrompt = settings.brand_voice_prompt;

    if (!brandVoicePrompt) {
        console.warn('[Settings Missing] Using raw prompt: –', rawPrompt);
        return rawPrompt;
    }

    let fullPrompt = rawPrompt;

    if (brandVoiceEnabled && brandVoicePrompt) {
        fullPrompt += `\n\n${brandVoicePrompt}`;
    }

    return fullPrompt;
}