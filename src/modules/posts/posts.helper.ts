import { Prisma } from "@prisma/client";
import { PostQueryDto } from "./dto/post.dto";

export const POST_AUTHOR_SELECT = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} as const;

export function generatePostSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") +
    "-" +
    Math.random().toString(36).substring(2, 7)
  );
}

export function buildPostWhereInput(query: PostQueryDto): Prisma.PostWhereInput {
  return {
    ...(query.published !== undefined ? { published: query.published } : {}),
    ...(query.tag ? { tags: { has: query.tag } } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: "insensitive" } },
            { summary: { contains: query.search, mode: "insensitive" } },
            { content: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export function buildPostOrderBy(
  query: PostQueryDto,
): Prisma.PostOrderByWithRelationInput {
  return {
    [query.sortBy || "createdAt"]: query.sortOrder || "desc",
  };
}
