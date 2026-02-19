import { file } from "bun";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const harFilePath = path.join(__dirname, "discord.har");

// Read the HAR file
const harData = JSON.parse(await file(harFilePath).text());

const urls = new Set<string>();
const errors: string[] = [];

harData.log.entries.forEach((entry: any) => {
	const url: string = entry.request.url;
	urls.add(url);
});

// Download the medias
for (const url of urls) {
	// Remove query parameters from the URL before getting the filename
	const urlWithoutQuery = url.split('?')[0] ?? url;
	let fileName = path.basename(urlWithoutQuery);
	
	// if filename is only "mp4", generate a name based on the URL prefix (last 10 characters before "mp4")
	if (fileName === "mp4") {
		const prefix = (url.split("mp4")[0] ?? "").slice(-10);
		const sanitizedPrefix = prefix.replace(/[^a-zA-Z0-9]/g, "");
		fileName = `${sanitizedPrefix}_.mp4`;
	}
	
	const filePath = path.join(__dirname, "downloads", fileName);

	// Check if file already exists
	if (await file(filePath).exists()) {
		console.log(`Already exists: ${fileName}`);
		continue;
	}

	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		
		await Bun.write(filePath, response);
		console.log(`Downloaded: ${fileName}`);
	} catch (err) {
		console.error(`Error downloading ${fileName}: ${(err as Error).message}`);
		errors.push(`${fileName}: ${(err as Error).message}`);
	}
}

// Export errors to a log file
await Bun.write(path.join(__dirname, "download_errors.log"), errors.join("\n"));