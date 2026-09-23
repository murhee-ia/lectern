const MAIL_URL = "http://127.0.0.1:54324";

async function fetchMessagesFor(email: string): Promise<Array<{ ID: string }>> {
  const searchResponse = await fetch(`${MAIL_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
  const { messages } = (await searchResponse.json()) as { messages: Array<{ ID: string }> };
  return messages;
}

export async function getLatestEmailLinkFor(
  email: string,
  linkPattern: RegExp,
  { retries = 20, delayMs = 750 }: { retries?: number; delayMs?: number } = {},
): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const messages = await fetchMessagesFor(email);

    for (const { ID } of messages) {
      const messageResponse = await fetch(`${MAIL_URL}/api/v1/message/${ID}`);
      const message = (await messageResponse.json()) as { Text: string; HTML: string };
      const match = message.HTML.match(linkPattern) ?? message.Text.match(linkPattern);
      if (match) return match[0];
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`No matching link found in any email to ${email} after ${retries} attempts`);
}
