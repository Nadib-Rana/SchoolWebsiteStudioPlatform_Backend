import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { PaginationUtil } from "../../common/utils/pagination.util";
import { Prisma, Role } from "@prisma/client";
import { CreatePostDto, UpdatePostDto, PostQueryDto } from "./dto/post.dto";

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  private generateSlug(title: string): string {
    return (
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 7)
    );
  }

  async findAll(query: PostQueryDto) {
    const { skip, take, page, limit } = PaginationUtil.getSkipTake(query);

    const where: Prisma.PostWhereInput = {
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

    const orderBy: Prisma.PostOrderByWithRelationInput = {
      [query.sortBy || "createdAt"]: query.sortOrder || "desc",
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return PaginationUtil.paginate(posts, total, page, limit);
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with slug '${slug}' not found`);
    }

    return post;
  }

  async findById(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID '${id}' not found`);
    }

    return post;
  }

  async create(authorId: string, dto: CreatePostDto) {
    const slug = dto.slug || this.generateSlug(dto.title);

    const existing = await this.prisma.post.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException("A post with this slug already exists");
    }

    return this.prisma.post.create({
      data: {
        title: dto.title,
        slug,
        summary: dto.summary,
        content: dto.content,
        coverImage: dto.coverImage,
        published: dto.published ?? false,
        tags: dto.tags || [],
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    dto: UpdatePostDto,
    currentUser: { id: string; role: Role },
  ) {
    const post = await this.findById(id);

    // Ownership check (Super Admin and Admin can update any post)
    if (
      post.authorId !== currentUser.id &&
      currentUser.role !== Role.SUPER_ADMIN &&
      currentUser.role !== Role.ADMIN
    ) {
      throw new ForbiddenException("You can only edit your own posts");
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug,
        summary: dto.summary,
        content: dto.content,
        coverImage: dto.coverImage,
        published: dto.published,
        tags: dto.tags,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async remove(id: string, currentUser: { id: string; role: Role }) {
    const post = await this.findById(id);

    if (
      post.authorId !== currentUser.id &&
      currentUser.role !== Role.SUPER_ADMIN &&
      currentUser.role !== Role.ADMIN
    ) {
      throw new ForbiddenException("You can only delete your own posts");
    }

    await this.prisma.post.delete({ where: { id } });

    return { message: "Post deleted successfully" };
  }
}
