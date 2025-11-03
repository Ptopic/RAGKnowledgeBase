import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

/**
 * Check if a user owns a specific item.
 *
 * @param prisma - Prisma service instance
 * @param model - Prisma model name (e.g., 'searchSpace', 'document', 'chat')
 * @param itemId - ID of the item to check
 * @param user - User object to verify ownership
 * @returns The item if found and owned by the user
 * @throws NotFoundException if item doesn't exist
 * @throws ForbiddenException if user doesn't own the item
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic type for items with id and userId
export async function checkOwnership<T extends { id: any; userId: string }>(
  prisma: PrismaService,
  model: keyof PrismaService,
  itemId: number | string,
  user: User,
): Promise<T> {
  // biome-ignore lint/suspicious/noExplicitAny: Prisma model access requires dynamic typing
  const prismaModel = prisma[model] as any;

  if (!prismaModel || typeof prismaModel.findFirst !== 'function') {
    throw new Error(`Invalid Prisma model: ${String(model)}`);
  }

  const item = await prismaModel.findFirst({
    where: {
      id: itemId,
      userId: user.id,
    },
  });

  if (!item) {
    // Check if the item exists at all
    const exists = await prismaModel.findUnique({
      where: { id: itemId },
    });

    if (!exists) {
      throw new NotFoundException(`Item not found`);
    }

    throw new ForbiddenException("You don't have permission to access this item");
  }

  return item;
}

/**
 * Check if a user owns multiple items.
 *
 * @param prisma - Prisma service instance
 * @param model - Prisma model name
 * @param itemIds - Array of item IDs to check
 * @param user - User object to verify ownership
 * @returns Array of items owned by the user
 * @throws ForbiddenException if any item is not owned by the user
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic type for items with id and userId
export async function checkMultipleOwnership<T extends { id: any; userId: string }>(
  prisma: PrismaService,
  model: keyof PrismaService,
  itemIds: (number | string)[],
  user: User,
): Promise<T[]> {
  // biome-ignore lint/suspicious/noExplicitAny: Prisma model access requires dynamic typing
  const prismaModel = prisma[model] as any;

  if (!prismaModel || typeof prismaModel.findMany !== 'function') {
    throw new Error(`Invalid Prisma model: ${String(model)}`);
  }

  const items = await prismaModel.findMany({
    where: {
      id: { in: itemIds },
      userId: user.id,
    },
  });

  if (items.length !== itemIds.length) {
    throw new ForbiddenException(
      "You don't have permission to access one or more of these items",
    );
  }

  return items;
}
