import {
    BadRequestException,
    Controller,
    Param,
    Query,
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

const getWorkoutSummaryQuerySchema = z.object({
    trainingId: z.coerce.number(),
})

const getWorkoutSummaryParamsSchema = z.object({
  id: z.coerce.number(),
});
type GetWorkoutSummaryParamsSchema = z.infer<typeof getWorkoutSummaryParamsSchema>;
type GetWorkoutSummaryQuerySchema = z.infer<typeof getWorkoutSummaryQuerySchema>;

type WorkoutWithDetails = Workout & {
    exercises: (Prisma.WorkoutExerciseGetPayload<{
        include: { WorkoutExerciseSets: true };
    }>)[];
};
type WorkoutWithTrainings = WorkoutWithDetails & { trainings: { id: number }[] };

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
        @Query(new ZodValidationPipe(getWorkoutSummaryQuerySchema))
        { trainingId }: GetWorkoutSummaryQuerySchema,
        @AuthenticationTokenPayload()
        authenticationTokenPayload: AuthenticationTokenPayloadSchema,
    ) {
        const userId = authenticationTokenPayload.sub;

        const contextTraining = await this.prismaService.training.findUnique({
            where: { id: trainingId },
            select: { name: true }
        });

        const currentWorkout = await this.prismaService.workout.findFirst({
            where: { id: workoutId, studentId: userId },
            include: {
                exercises: {
                    include: {
                        exercise: { select: { name: true } },
                        WorkoutExerciseSets: true,
                    },
                },
            },
        });

        if (!currentWorkout || !currentWorkout.endTime || !contextTraining) {
            throw new BadRequestException('Workout finalizado ou plano de treino não encontrado.');
        }

        const trainingName = contextTraining?.name || "Treino";
        const totalDurationSeconds = differenceInSeconds(currentWorkout.endTime, currentWorkout.startTime);
        const totalVolume = calculateVolume(currentWorkout);
        const exercisePerformances: ExercisePerformanceSummary[] = currentWorkout.exercises.map((we) => ({
            exerciseId: we.exerciseId,
            name: we.exercise.name,
            currentVolume: calculateVolume({ ...currentWorkout, exercises: [we] }),
            previousVolume: null,
        }));

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
                        id: trainingId
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
            
		const workoutsOfSameTypeCount = allWorkoutsInContext.length;

		const allUserWorkouts = await this.prismaService.workout.findMany({
			where: { studentId: userId, endTime: { not: null } },
			orderBy: { endTime: 'asc' },
			include: {
                trainings: { select: { id: true } },
                exercises: { include: { WorkoutExerciseSets: true } }
            },
		});

		let totalPrsForUser = 0;
        const countedPrWorkoutIds = new Set<number>();

        const workoutsByTraining = allUserWorkouts.reduce((acc, workout) => {
            workout.trainings.forEach(training => {
                const id = training.id;
                if (!acc[id]) acc[id] = [];
                acc[id].push(workout);
            });
            return acc;
        }, {} as Record<number, WorkoutWithTrainings[]>);

        for (const trainingGroupId in workoutsByTraining) {
            const groupWorkouts = workoutsByTraining[trainingGroupId];
            groupWorkouts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            
            let maxVolumeInGroup = 0;
            for (const workout of groupWorkouts) {
                const workoutVolume = calculateVolume(workout);
                if (workoutVolume > maxVolumeInGroup) {
                    if (!countedPrWorkoutIds.has(workout.id)) {
                        totalPrsForUser++;
                        countedPrWorkoutIds.add(workout.id);
                    }
                    maxVolumeInGroup = workoutVolume;
                }
            }
        }
        
        const totalWorkoutsForUser = allUserWorkouts.length;
		
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