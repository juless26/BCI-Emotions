exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { prompt, realism } = JSON.parse(event.body);
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required' }) };
    }

    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Stability API key not configured' }) };
    }

    // Every step on the slider changes the prompt. Previously only 1-2 and 5
    // did, so dragging between 2, 3 and 4 asked for exactly the same picture
    // and the control looked broken.
    const STYLE = {
      1: ', loose expressive oil painting, heavy visible brushstrokes, abstract, painterly',
      2: ', impressionistic painting, soft edges, artistic interpretation',
      3: ', stylised illustration, painterly light, gentle detail',
      4: ', naturalistic rendering, photographic lighting, fine detail',
      5: ', photorealistic, highly detailed, professional photography, sharp focus',
    };
    const step = Math.min(5, Math.max(1, Number(realism) || 3));
    const enhancedPrompt = prompt + STYLE[step];

    // Call Stability AI API
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: enhancedPrompt,
            weight: 1
          }
        ],
        cfg_scale: 7.0,
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 30
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Stability API error:', response.status, responseData);
      throw new Error(`Stability API error: ${response.status} - ${JSON.stringify(responseData).substring(0, 200)}`);
    }

    if (!responseData.artifacts || responseData.artifacts.length === 0) {
      throw new Error('No image generated');
    }

    const imageBase64 = `data:image/png;base64,${responseData.artifacts[0].base64}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Server error' })
    };
  }
};
