const fs = require("fs");
const path = require("path");

const FAL_KEY =
  "31884def-7924-4a8b-ab4c-3395d35eedfb:79aae27bd73be7a1711b74803119320c";
const MODEL = "fal-ai/nano-banana-2";
const IMAGES_DIR = path.join(__dirname, "public", "images");
const HTML_FILE = path.join(__dirname, "index.html");

const tasks = [
  {
    prompt:
      "Ultra minimal luxury tech background, black, white glow, Apple style, 4K",
    filename: "hero.png",
    section: "hero",
  },
  {
    prompt: "Abstract AI network, thin lines, monochrome, elegant, cinematic",
    filename: "ai-network.png",
    section: "ai",
  },
  {
    prompt:
      "Futuristic communication waveform, minimal, premium SaaS style",
    filename: "callchloe.png",
    section: "callchloe",
  },
];

async function submitRequest(prompt) {
  const res = await fetch("https://queue.fal.run/" + MODEL, {
    method: "POST",
    headers: {
      Authorization: "Key " + FAL_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: "landscape_16_9",
      num_images: 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Submit failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function pollForResult(requestId) {
  const statusUrl = `https://queue.fal.run/${MODEL}/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/${MODEL}/requests/${requestId}`;

  console.log(`  Polling for request ${requestId}...`);

  while (true) {
    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: "Key " + FAL_KEY },
    });
    const status = await statusRes.json();

    if (status.status === "COMPLETED") {
      const resultRes = await fetch(resultUrl, {
        headers: { Authorization: "Key " + FAL_KEY },
      });
      return resultRes.json();
    }

    if (status.status === "FAILED") {
      throw new Error(`Request ${requestId} failed: ${JSON.stringify(status)}`);
    }

    // Wait 2 seconds before polling again
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function downloadImage(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
}

function updateHTML(imagePaths) {
  let html = fs.readFileSync(HTML_FILE, "utf-8");

  // 1. Hero: replace the existing background-image URL in .hero
  const heroPath = "public/images/hero.png";
  html = html.replace(
    /\.hero\{([^}]*?)background:url\('[^']+'\)/,
    `.hero{$1background:url('${heroPath}')`
  );
  console.log("  Updated hero background image in CSS");

  // 2. AI network: replace the existing .wwd-ai background URL
  const aiPath = "public/images/ai-network.png";
  html = html.replace(
    /\.wwd-ai\{background:url\('[^']+'\)/,
    `.wwd-ai{background:url('${aiPath}')`
  );
  console.log("  Updated AI & Automation card background image in CSS");

  // 3. CallChloe: add background image to the .chloe section
  const chloePath = "public/images/callchloe.png";
  if (html.includes(".chloe{")) {
    html = html.replace(
      /\.chloe\{([^}]*?)\}/,
      `.chloe{$1;background:url('${chloePath}') center/cover no-repeat}`
    );
  } else {
    // Insert as a new rule after .chloe-glow or before the chloe section styles
    html = html.replace(
      /\.chloe-glow\{/,
      `.chloe-bg{background:url('${chloePath}') center/cover no-repeat}\n.chloe-glow{`
    );
  }
  console.log("  Updated CallChloe section background image in CSS");

  fs.writeFileSync(HTML_FILE, html);
}

async function generateImage(task) {
  console.log(`\n[${task.filename}] Generating: "${task.prompt}"`);

  // Submit the request
  const submitData = await submitRequest(task.prompt);
  const requestId = submitData.request_id;
  console.log(`  Queued with request_id: ${requestId}`);

  // Poll for completion
  const result = await pollForResult(requestId);

  // Get image URL from result
  const imageUrl = result.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error(
      `No image URL in response: ${JSON.stringify(result).slice(0, 200)}`
    );
  }
  console.log(`  Image ready: ${imageUrl}`);

  // Download and save
  const filepath = path.join(IMAGES_DIR, task.filename);
  await downloadImage(imageUrl, filepath);
  const size = fs.statSync(filepath).size;
  console.log(
    `  Saved: ${filepath} (${(size / 1024).toFixed(1)} KB)`
  );

  return filepath;
}

async function main() {
  console.log("=== Malka Ventures Image Generator ===\n");
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${IMAGES_DIR}\n`);

  // Ensure output directory exists
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  // Generate all 3 images concurrently
  const results = await Promise.all(tasks.map((t) => generateImage(t)));

  console.log("\n--- All images generated ---\n");
  results.forEach((r) => console.log(`  ✓ ${r}`));

  // Update HTML
  console.log("\nUpdating index.html...");
  updateHTML(results);

  console.log("\n=== Done! All images generated and HTML updated. ===");
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
