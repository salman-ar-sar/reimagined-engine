import { eq, asc } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

export type GameSortOption = 'title-asc' | 'title-desc' | 'rating-desc';

/**
 * Sorts games for display. Unrated entries stay at the end when ordering by rating.
 */
export function sortGames(gamesToSort: Game[], sortBy: GameSortOption = 'title-asc'): Game[] {
    return [...gamesToSort].sort((left, right) => {
        if (sortBy === 'title-desc') {
            return right.title.localeCompare(left.title, undefined, { sensitivity: 'base' });
        }

        if (sortBy === 'rating-desc') {
            const leftRating = left.starRating ?? Number.NEGATIVE_INFINITY;
            const rightRating = right.starRating ?? Number.NEGATIVE_INFINITY;

            if (leftRating === rightRating) {
                return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
            }

            if (leftRating === Number.NEGATIVE_INFINITY) {
                return 1;
            }

            if (rightRating === Number.NEGATIVE_INFINITY) {
                return -1;
            }

            return rightRating - leftRating;
        }

        return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
    });
}

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/** All games ordered by title. */
export async function getAllGames(db: Database): Promise<Game[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
