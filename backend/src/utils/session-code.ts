import { prisma } from '../db';

const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars

export async function generateSessionCode(): Promise<string> {
  let code: string;
  let isUnique = false;

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
    }

    // Check uniqueness
    const existing = await prisma.gameSession.findUnique({
      where: { session_code: code },
    });

    if (!existing) {
      isUnique = true;
      return code;
    }
  }

  throw new Error('Failed to generate unique session code');
}
