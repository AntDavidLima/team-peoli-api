import {
    BadRequestException,
    Controller,
    Param,
    UseGuards,
    Get
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/authentication/authentication.guard';
import { AuthenticationTokenPayloadSchema } from 'src/authentication/authentication.strategy';
import { AuthenticationTokenPayload } from 'src/authentication/token-payload/token-payload.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ZodValidationPipe } from 'src/zod-validation/zod-validation.pipe';
import { z } from 'zod';
import { differenceInSeconds } from 'date-fns';
import { Prisma, Workout } from '@prisma/client';

interface ExercisePerformanceSummary {
    exerciseId: number;
    name: string;
    currentVolume: number;
    previousVolume: number | null;
}

const getWorkoutSummaryParamsSchema = z.object({
  id: z.coerce.number(),
});

type GetWorkoutSummaryParamsSchema = z.infer<typeof getWorkoutSummaryParamsSchema>;

type WorkoutWithDetails = Workout & {
    exercises: (Prisma.WorkoutExerciseGetPayload<{
        include: { WorkoutExerciseSets: true };
    }>)[];
};

const calculateVolume = (workout: WorkoutWithDetails): number => {
    return workout.exercises.reduce((workoutSum, exercise) => {
        const exerciseVolume = exercise.WorkoutExerciseSets.reduce(
            (exerciseSum, set) => exerciseSum + Number(set.load) * set.reps,
            0,
        );
        return workoutSum + exerciseVolume;
    }, 0);
};


@Controller('summary')
@UseGuards(AuthenticationGuard)
export class SummaryController {
    constructor(private prismaService: PrismaService) { }

    @Get('workout/:id')
    async getSummary(
        @Param(new ZodValidationPipe(getWorkoutSummaryParamsSchema))
        { id: workoutId }: GetWorkoutSummaryParamsSchema,
        @AuthenticationTokenPayload()
        authenticationTokenPayload: AuthenticationTokenPayloadSchema,
    ) {
        const userId = authenticationTokenPayload.sub;

        const currentWorkout = await this.prismaService.workout.findFirst({
            where: { id: workoutId, studentId: userId },
            include: {
                trainings: {
                    select: { id: true, name: true }
                },
                exercises: {
                    include: {
                        exercise: { select: { name: true } },
                        WorkoutExerciseSets: true,
                    },
                },
            },
        });

        if (!currentWorkout || !currentWorkout.endTime) {
            throw new BadRequestException('Workout finalizado não encontrado ou não pertence ao usuário.');
        }

        const namedTraining = currentWorkout.trainings.find(t => t.name);
        const trainingName = namedTraining?.name || "Treino";
        const totalDurationSeconds = differenceInSeconds(currentWorkout.endTime, currentWorkout.startTime);
        const totalVolume = calculateVolume(currentWorkout);
        const exercisePerformances: ExercisePerformanceSummary[] = currentWorkout.exercises.map((we) => ({
            exerciseId: we.exerciseId,
            name: we.exercise.name,
            currentVolume: calculateVolume({ ...currentWorkout, exercises: [we] }),
            previousVolume: null,
        }));

        const contextualTrainingIds = currentWorkout.trainings.map(t => t.id);
        const allPreviousWorkoutsOfSameType = await this.prismaService.workout.findMany({
            where: {
                studentId: userId,
                id: {
                    not: workoutId
                },
                endTime: {
                    not: null
                },
                trainings: {
                    some: {
                        id: {
                            in: contextualTrainingIds
                        }
                    }
                },
            },
            orderBy: {
                endTime: 'asc'
            },
            include: {
                exercises: {
                    include: {
                        WorkoutExerciseSets: true
                    }
                }
            },
        });

        let previousTotalVolume: number | null = null;
        let allTimeBestVolume: number | null = null;
        if (allPreviousWorkoutsOfSameType.length > 0) {
            const lastPreviousWorkout = allPreviousWorkoutsOfSameType[allPreviousWorkoutsOfSameType.length - 1];
            previousTotalVolume = calculateVolume(lastPreviousWorkout);
            for (const performance of exercisePerformances) {
                const prevExercise = lastPreviousWorkout.exercises.find(pe => pe.exerciseId === performance.exerciseId);
                if (prevExercise) {
                    performance.previousVolume = calculateVolume({ ...lastPreviousWorkout, exercises: [prevExercise] });
                }
            }

            const previousVolumes = allPreviousWorkoutsOfSameType.map(workout => calculateVolume(workout));
            allTimeBestVolume = Math.max(...previousVolumes);
        }

        const allWorkoutsInContext = [...allPreviousWorkoutsOfSameType, currentWorkout];
        const volumeHistoryForGraph = allWorkoutsInContext
            .slice(-4)
            .map(workout => ({
                date: workout.endTime,
                volume: calculateVolume(workout),
            }));

        const allUserWorkouts = await this.prismaService.workout.findMany({
            where: { studentId: userId, endTime: { not: null } },
            orderBy: { endTime: 'asc' },
            include: { exercises: { include: { WorkoutExerciseSets: true } } },
        });

        let totalPrsForUser = 0;
        let currentMaxVolume = 0;
        if (allUserWorkouts.length > 0) {
            for (const workout of allUserWorkouts) {
                const workoutVolume = calculateVolume(workout);
                if (workoutVolume > currentMaxVolume) {
                    totalPrsForUser++;
                    currentMaxVolume = workoutVolume;
                }
            }
        }

        const totalWorkoutsForUser = allUserWorkouts.length;
        const workoutsOfSameTypeCount = allWorkoutsInContext.length;

        return {
            totalDurationSeconds,
            totalVolume,
            previousTotalVolume,
            totalWorkoutsForUser,
            allTimeBestVolume,
            totalPrsForUser,
            exercisePerformances,
            volumeHistory: volumeHistoryForGraph,
            workoutsOfSameTypeCount,
            trainingName
        };
    }
}
