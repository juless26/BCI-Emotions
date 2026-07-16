const Replicate = require('replicate');
const https = require('https');

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { prompt, realism } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    // Get API token from environment variable
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      console.error('REPLICATE_API_TOKEN not set');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API token not configured' })
      };
    }

    // Initialize Replicate client
    const replicate = new Replicate({ auth: apiToken });

    // Add style prompts based on realism
    let enhancedPrompt = prompt;
    if (realism <= 2) {
      enhancedPrompt += ', impressionistic, painterly, artistic style';
    } else if (realism >= 5) {
      enhancedPrompt += ', photorealistic, highly detailed, professional photography';
    }

    console.log('Calling Replicate with prompt:', enhancedPrompt);

    // Run the model using Replicate client
    // Use the direct model call which automatically resolves to latest version
    const output = await replicate.run('black-forest-labs/flux-2-pro', {
      input: {
        prompt: enhancedPrompt,
        resolution: '1 MP',
        aspect_ratio: '1:1',
        output_format: 'webp'
      }
    });

    // output is an array of image URLs
    const imageUrl = output[0];

    if (!imageUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to generate image' })
      };
    }

    // Fetch the image and convert to base64
    const imageBase64 = await fetchImageAsBase64(imageUrl);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: imageBase64
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: error.message || 'Server error'
      })
    };
  }
};

async function fetchImageAsBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    https.get(imageUrl, (res) => {
      let data = '';
      res.setEncoding('binary');

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const base64 = Buffer.from(data, 'binary').toString('base64');
        resolve(`data:image/webp;base64,${base64}`);
      });
    }).on('error', reject);
  });
}
