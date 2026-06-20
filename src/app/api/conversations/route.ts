import { prisma } from "@/lib/db";

export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
    take: 20,
  });

  return Response.json(conversations);
}

export async function POST() {
  const conversation = await prisma.conversation.create({
    data: {},
    include: { messages: true },
  });

  return Response.json(conversation);
}
