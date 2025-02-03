import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';
import {
  File,
  FileFieldsInterceptor,
} from '@nest-lab/fastify-multer';
import { ConfigService } from '@nestjs/config';
import { Env } from '../env';
import slugify from 'slugify';
import * as path from 'node:path';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const literalSchema = z.union([z.string(), z.number(), z.boolean()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]),
);

const createExerciseBodySchema = z.object({
  name: z.string({ required_error: "O campo 'Nome' é obrigatório" }),
  instructions: z.string(),
  restTime: z.coerce.number().optional(),
  muscleGroups: z
    .object({
      value: z.coerce.number({
        required_error:
          'Não foi possível identificar um ou mais dos grupos musculares',
      }),
      weight: z.coerce.number({
        required_error: "Um ou mais dos grupos musculares está sem 'Peso'",
      }),
    })
    .array()
    .min(1, {
      message: 'Cada exercício deve possuir pelo menos um grupo muscular',
    }),
});

type CreateExerciseBodySchema = z.infer<typeof createExerciseBodySchema>;

const listExercisesQueryParamsSchema = z.object({
  rows: z.coerce.number().default(100),
  page: z.coerce.number().default(1),
  query: z.string().default(''),
});

type ListExercisesQueryParamsSchema = z.infer<
  typeof listExercisesQueryParamsSchema
>;

const deleteExerciseParamsSchema = z.object({
  id: z.coerce.number(),
});

type DeleteExerciseParamsSchema = z.infer<typeof deleteExerciseParamsSchema>;

const updateExerciseParamsSchema = z.object({
  id: z.coerce.number(),
});

type UpdateExerciseParamsSchema = z.infer<typeof updateExerciseParamsSchema>;

const updateExerciseBodySchema = z.object({
  name: z.string({ required_error: "O campo 'Nome' é obrigatório" }),
  instructions: z.string(),
  restTime: z.coerce.number().optional(),
  muscleGroups: z
    .object({
      value: z.coerce.number({
        required_error:
          'Não foi possível identificar um ou mais dos grupos musculares',
      }),
      weight: z.coerce.number({
        required_error: "Um ou mais dos grupos musculares está sem 'Peso'",
      }),
    })
    .array()
    .min(1, {
      message: 'Cada exercício deve possuir pelo menos um grupo muscular',
    }),
});

type UpdateExerciseBodySchema = z.infer<typeof updateExerciseBodySchema>;

@Controller('exercise')
@UseGuards(AuthenticationGuard)
export class ExerciseController {
  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService<Env, true>,
  ) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'executionVideo', maxCount: 1 },
      { name: 'videoThumbnail', maxCount: 1 },
    ]),
  )
  async store(
    @Body(new ZodValidationPipe(createExerciseBodySchema))
    { name, instructions, restTime, muscleGroups }: CreateExerciseBodySchema,
    @AuthenticationTokenPayload()
    authenticationTokenPayload: AuthenticationTokenPayloadSchema,
    @UploadedFiles()
    { executionVideo, videoThumbnail }: { executionVideo?: File[]; videoThumbnail?: File[] },
  ) {
    const currentUser = await this.prismaService.user.findUnique({
      where: {
        id: authenticationTokenPayload.sub,
      },
      select: {
        isProfessor: true,
      },
    });

    if (!currentUser) {
      throw new BadRequestException(
        'Não foi possível identificar o usuário logado',
      );
    }

    if (!currentUser.isProfessor) {
      throw new ForbiddenException(
        'Apenas professores podem criar novos exercícios',
      );
    }

    const muscleGroupsExist = await this.prismaService.muscleGroup.findMany({
      where: {
        id: {
          in: muscleGroups.map((muscleGroup) => muscleGroup.value),
        },
      },
    });

    if (muscleGroupsExist.length !== muscleGroups.length) {
      throw new BadRequestException(
        'Um ou mais dos grupos musculares informados não foram encontrados',
      );
    }

    let executionVideoUrl: string | undefined = undefined;
		let thumbnailUrl: string | undefined = undefined;

    if (executionVideo && executionVideo[0]) {
      const s3Client = new S3Client({
        region: this.configService.get('BUCKET_REGION', { infer: true }),
        credentials: {
          accessKeyId: this.configService.get('BUCKET_ACCESS_KEY', {
            infer: true,
          }),
          secretAccessKey: this.configService.get('BUCKET_SECRET_ACCESS_KEY', {
            infer: true,
          }),
        },
      });

      await s3Client.send(
        new PutObjectCommand({
          Bucket: this.configService.get('VIDEOS_BUCKET_NAME', { infer: true }),
          Key:
            slugify(name, { lower: true }) +
            path.extname(executionVideo[0].originalname),
          Body: executionVideo[0].buffer,
        }),
      );

      executionVideoUrl = `https://${this.configService.get('VIDEOS_BUCKET_NAME')}.s3.amazonaws.com/${slugify(name, { lower: true })}${path.extname(executionVideo[0].originalname)}`;
    }

    if (videoThumbnail && videoThumbnail[0]) {
      const s3Client = new S3Client({
        region: this.configService.get('BUCKET_REGION', { infer: true }),
        credentials: {
          accessKeyId: this.configService.get('BUCKET_ACCESS_KEY', {
            infer: true,
          }),
          secretAccessKey: this.configService.get('BUCKET_SECRET_ACCESS_KEY', {
            infer: true,
          }),
        },
      });

      await s3Client.send(
        new PutObjectCommand({
          Bucket: this.configService.get('THUMBS_BUCKET_NAME', { infer: true }),
          Key:
            slugify(name, { lower: true }) +
            path.extname(videoThumbnail[0].originalname),
          Body: videoThumbnail[0].buffer,
        }),
      );

      thumbnailUrl = `https://${this.configService.get('THUMBS_BUCKET_NAME')}.s3.amazonaws.com/${slugify(name, { lower: true })}${path.extname(videoThumbnail[0].originalname)}`;
    }

    return await this.prismaService.exercise.create({
      data: {
        name,
        instructions: JSON.parse(instructions),
        restTime,
        executionVideoUrl,
				thumbnailUrl,
        muscleGroups: {
          createMany: {
            data: muscleGroups.map((muscleGroup) => ({
              weight: muscleGroup.weight,
              muscleGroupId: muscleGroup.value,
            })),
          },
        },
      },
      select: {
        id: true,
        name: true,
        instructions: true,
        restTime: true,
      },
    });
  }

  @Get()
  async index(
    @AuthenticationTokenPayload()
    authenticationTokenPayload: AuthenticationTokenPayloadSchema,
    @Query(new ZodValidationPipe(listExercisesQueryParamsSchema))
    { page, rows, query }: ListExercisesQueryParamsSchema,
  ) {
    const currentUser = await this.prismaService.user.findUnique({
      where: {
        id: authenticationTokenPayload.sub,
      },
      select: {
        isProfessor: true,
      },
    });

    if (!currentUser) {
      throw new BadRequestException(
        'Não foi possível identificar o usuário logado',
      );
    }

    if (!currentUser.isProfessor) {
      throw new ForbiddenException(
        'Lista de exercícios disponível apenas para professores',
      );
    }

    return this.prismaService.$transaction([
      this.prismaService.exercise.count({
        where: {
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              muscleGroups: {
                some: {
                  muscleGroup: {
                    name: {
                      contains: query,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
          ],
        },
      }),
      this.prismaService.exercise.findMany({
        where: {
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              muscleGroups: {
                some: {
                  muscleGroup: {
                    name: {
                      contains: query,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          instructions: true,
          restTime: true,
          executionVideoUrl: true,
          muscleGroups: {
            select: {
              weight: true,
              muscleGroup: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
        },
        skip: (page - 1) * rows,
        take: rows,
      }),
    ]);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async destroy(
    @AuthenticationTokenPayload()
    authenticationTokenPayload: AuthenticationTokenPayloadSchema,
    @Param(new ZodValidationPipe(deleteExerciseParamsSchema))
    { id }: DeleteExerciseParamsSchema,
  ) {
    const currentUser = await this.prismaService.user.findUnique({
      where: {
        id: authenticationTokenPayload.sub,
      },
      select: {
        isProfessor: true,
      },
    });

    if (!currentUser) {
      throw new BadRequestException(
        'Não foi possível identificar o usuário logado',
      );
    }

    if (!currentUser.isProfessor) {
      throw new ForbiddenException(
        'Apenas professores podem deletar exercícios',
      );
    }

    const exercise = await this.prismaService.exercise.findUnique({
      select: {
        id: true,
        trainings: true,
        executionVideoUrl: true,
        name: true,
        thumbnailUrl: true,
      },
      where: {
        id,
      },
    });

    if (!exercise) {
      throw new BadRequestException('Exercício não encontrado');
    }

    if (exercise.trainings.length > 0) {
      throw new ConflictException(
        'Exercício não pode ser excluído por fazer parte de um ou mais treinos',
      );
    }

    if (exercise.executionVideoUrl) {
      const s3Client = new S3Client({
        region: this.configService.get('BUCKET_REGION', { infer: true }),
        credentials: {
          accessKeyId: this.configService.get('BUCKET_ACCESS_KEY', {
            infer: true,
          }),
          secretAccessKey: this.configService.get('BUCKET_SECRET_ACCESS_KEY', {
            infer: true,
          }),
        },
      });

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.configService.get('VIDEOS_BUCKET_NAME', { infer: true }),
          Key:
            slugify(exercise.name, { lower: true }) +
            exercise.executionVideoUrl.match(/\.[0-9a-z]+$/i)![0],
        }),
      );
    }

    if (exercise.thumbnailUrl) {
      const s3Client = new S3Client({
        region: this.configService.get('BUCKET_REGION', { infer: true }),
        credentials: {
          accessKeyId: this.configService.get('BUCKET_ACCESS_KEY', {
            infer: true,
          }),
          secretAccessKey: this.configService.get('BUCKET_SECRET_ACCESS_KEY', {
            infer: true,
          }),
        },
      });

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.configService.get('THUMBS_BUCKET_NAME', { infer: true }),
          Key:
            slugify(exercise.name, { lower: true }) +
            exercise.thumbnailUrl.match(/\.[0-9a-z]+$/i)![0],
        }),
      );
    }

    const deleteExercisedMuscleGroupsPromise =
      this.prismaService.exercisedMuscleGroup.deleteMany({
        where: {
          exerciseId: exercise.id,
        },
      });

    const deleteExercisePromise = this.prismaService.exercise.delete({
      where: {
        id: exercise.id,
      },
    });

    await this.prismaService.$transaction([
      deleteExercisedMuscleGroupsPromise,
      deleteExercisePromise,
    ]);
  }

  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'executionVideo', maxCount: 1 },
      { name: 'videoThumbnail', maxCount: 1 },
    ]),
  )
  async update(
    @AuthenticationTokenPayload()
    authenticationTokenPayload: AuthenticationTokenPayloadSchema,
    @Param(new ZodValidationPipe(updateExerciseParamsSchema))
    { id }: UpdateExerciseParamsSchema,
    @Body(new ZodValidationPipe(updateExerciseBodySchema))
    { name, restTime, instructions, muscleGroups }: UpdateExerciseBodySchema,
    @UploadedFiles()
    { executionVideo, videoThumbnail }: { executionVideo?: File[]; videoThumbnail?: File[] },
  ) {
    const currentUser = await this.prismaService.user.findUnique({
      where: {
        id: authenticationTokenPayload.sub,
      },
      select: {
        isProfessor: true,
        id: true,
      },
    });

    if (!currentUser) {
      throw new BadRequestException(
        'Não foi possível identificar o usuário logado',
      );
    }

    if (!currentUser.isProfessor) {
      throw new ForbiddenException(
        'Apenas professores podem editar exercícios',
      );
    }

    const exercise = await this.prismaService.exercise.findUnique({
      select: {
        id: true,
        name: true,
        executionVideoUrl: true,
        thumbnailUrl: true,
      },
      where: {
        id,
      },
    });

    if (!exercise) {
      throw new BadRequestException('Exercício não encontrado');
    }

    let executionVideoUrl;
    let thumbnailUrl;

    if (executionVideo && executionVideo[0]) {
      const s3Client = new S3Client({
        region: this.configService.get('BUCKET_REGION', { infer: true }),
        credentials: {
          accessKeyId: this.configService.get('BUCKET_ACCESS_KEY', {
            infer: true,
          }),
          secretAccessKey: this.configService.get('BUCKET_SECRET_ACCESS_KEY', {
            infer: true,
          }),
        },
      });

      await s3Client.send(
        new PutObjectCommand({
          Bucket: this.configService.get('VIDEOS_BUCKET_NAME', { infer: true }),
          Key:
            slugify(name, { lower: true }) +
            path.extname(executionVideo[0].originalname),
          Body: executionVideo[0].buffer,
        }),
      );

      if (exercise.name !== name && exercise.executionVideoUrl) {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.configService.get('VIDEOS_BUCKET_NAME', { infer: true }),
            Key:
              slugify(exercise.name, { lower: true }) +
              exercise.executionVideoUrl.match(/\.[0-9a-z]+$/i)![0],
          }),
        );
      }

      executionVideoUrl = `https://${this.configService.get('VIDEOS_BUCKET_NAME')}.s3.amazonaws.com/${slugify(name, { lower: true })}${path.extname(executionVideo[0].originalname)}`;
    }

    if (videoThumbnail && videoThumbnail[0]) {
      const s3Client = new S3Client({
        region: this.configService.get('BUCKET_REGION', { infer: true }),
        credentials: {
          accessKeyId: this.configService.get('BUCKET_ACCESS_KEY', {
            infer: true,
          }),
          secretAccessKey: this.configService.get('BUCKET_SECRET_ACCESS_KEY', {
            infer: true,
          }),
        },
      });

      await s3Client.send(
        new PutObjectCommand({
          Bucket: this.configService.get('THUMBS_BUCKET_NAME', { infer: true }),
          Key:
            slugify(name, { lower: true }) +
            path.extname(videoThumbnail[0].originalname),
          Body: videoThumbnail[0].buffer,
        }),
      );

      if (exercise.name !== name && exercise.thumbnailUrl) {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.configService.get('THUMBS_BUCKET_NAME', { infer: true }),
            Key:
              slugify(exercise.name, { lower: true }) +
              exercise.thumbnailUrl.match(/\.[0-9a-z]+$/i)![0],
          }),
        );
      }

      thumbnailUrl = `https://${this.configService.get('THUMBS_BUCKET_NAME')}.s3.amazonaws.com/${slugify(name, { lower: true })}${path.extname(videoThumbnail[0].originalname)}`;
    }

    if (
      exercise.name !== name &&
      exercise.executionVideoUrl &&
      (!executionVideo || !executionVideo[0])
    ) {
      const s3Client = new S3Client({
        region: this.configService.get('BUCKET_REGION', { infer: true }),
        credentials: {
          accessKeyId: this.configService.get('BUCKET_ACCESS_KEY', {
            infer: true,
          }),
          secretAccessKey: this.configService.get('BUCKET_SECRET_ACCESS_KEY', {
            infer: true,
          }),
        },
      });

      await s3Client.send(
        new CopyObjectCommand({
          Bucket: this.configService.get('VIDEOS_BUCKET_NAME', { infer: true }),
          CopySource: `${this.configService.get('VIDEOS_BUCKET_NAME', { infer: true })}/${slugify(exercise.name, { lower: true }) + exercise.executionVideoUrl.match(/\.[0-9a-z]+$/i)![0]}`,
          Key:
            slugify(name, { lower: true }) +
            exercise.executionVideoUrl.match(/\.[0-9a-z]+$/i)![0],
        }),
      );

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.configService.get('VIDEOS_BUCKET_NAME', { infer: true }),
          Key:
            slugify(exercise.name, { lower: true }) +
            exercise.executionVideoUrl.match(/\.[0-9a-z]+$/i)![0],
        }),
      );

      executionVideoUrl = `https://${this.configService.get('VIDEOS_BUCKET_NAME')}.s3.amazonaws.com/${slugify(name, { lower: true })}${exercise.executionVideoUrl.match(/\.[0-9a-z]+$/i)![0]}}`;
    }

    if (
      exercise.name !== name &&
      exercise.thumbnailUrl &&
      (!videoThumbnail || !videoThumbnail[0])
    ) {
      const s3Client = new S3Client({
        region: this.configService.get('BUCKET_REGION', { infer: true }),
        credentials: {
          accessKeyId: this.configService.get('BUCKET_ACCESS_KEY', {
            infer: true,
          }),
          secretAccessKey: this.configService.get('BUCKET_SECRET_ACCESS_KEY', {
            infer: true,
          }),
        },
      });

      await s3Client.send(
        new CopyObjectCommand({
          Bucket: this.configService.get('THUMBS_BUCKET_NAME', { infer: true }),
          CopySource: `${this.configService.get('THUMBS_BUCKET_NAME', { infer: true })}/${slugify(exercise.name, { lower: true }) + exercise.thumbnailUrl.match(/\.[0-9a-z]+$/i)![0]}`,
          Key:
            slugify(name, { lower: true }) +
            exercise.thumbnailUrl.match(/\.[0-9a-z]+$/i)![0],
        }),
      );

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.configService.get('THUMBS_BUCKET_NAME', { infer: true }),
          Key:
            slugify(exercise.name, { lower: true }) +
            exercise.thumbnailUrl.match(/\.[0-9a-z]+$/i)![0],
        }),
      );

      thumbnailUrl = `https://${this.configService.get('THUMBS_BUCKET_NAME')}.s3.amazonaws.com/${slugify(name, { lower: true })}${exercise.thumbnailUrl.match(/\.[0-9a-z]+$/i)![0]}}`;
    }

    const updatedExercise = await this.prismaService.exercise.update({
      data: {
        name,
        instructions: JSON.parse(instructions),
        executionVideoUrl,
        thumbnailUrl,
        restTime,
        muscleGroups: {
          deleteMany: {
            exerciseId: exercise.id,
          },
          createMany: {
            data: muscleGroups.map((muscleGroup) => ({
              weight: muscleGroup.weight,
              muscleGroupId: muscleGroup.value,
            })),
          },
        },
      },
      select: {
        id: true,
        name: true,
        instructions: true,
        restTime: true,
      },
      where: {
        id,
      },
    });

    return updatedExercise;
  }
}
