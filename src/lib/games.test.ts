import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import type { Game } from '../types/game';
import {
    getAllGames,
    getAllGameIds,
    getCatalogSummary,
    getGameById,
    sortGames,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('sorts games by title in reverse order when requested', () => {
        const gamesToSort: Game[] = [
            { id: 1, title: 'Alpha', description: 'A', publisher: null, category: null, starRating: 4.5 },
            { id: 2, title: 'Bravo', description: 'B', publisher: null, category: null, starRating: 5.0 },
            { id: 3, title: 'Charlie', description: 'C', publisher: null, category: null, starRating: null },
        ];

        expect(sortGames(gamesToSort, 'title-desc').map((game) => game.title)).toEqual(['Charlie', 'Bravo', 'Alpha']);
    });

    it('sorts games by rating with unrated entries last', () => {
        const gamesToSort: Game[] = [
            { id: 1, title: 'Alpha', description: 'A', publisher: null, category: null, starRating: 3.9 },
            { id: 2, title: 'Bravo', description: 'B', publisher: null, category: null, starRating: 5.0 },
            { id: 3, title: 'Charlie', description: 'C', publisher: null, category: null, starRating: null },
        ];

        expect(sortGames(gamesToSort, 'rating-desc').map((game) => game.title)).toEqual(['Bravo', 'Alpha', 'Charlie']);
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('computes a catalog summary with the average rating across rated games', async () => {
        await seedGames(db, 3);
        const summary = await getCatalogSummary(db);

        expect(summary).toEqual({ totalGames: 3, ratedGames: 3, averageStarRating: 4.2 });
    });

    it('returns a null average when there are no rated games', async () => {
        await db.insert(categories).values({ name: 'Strategy', description: 'cat' });
        await db.insert(publishers).values({ name: 'Pub One', description: 'pub' });

        await db.insert(games).values({
            title: 'Unrated Game',
            description: 'No rating here',
            starRating: null,
            categoryId: 1,
            publisherId: 1,
        });

        expect(await getCatalogSummary(db)).toEqual({ totalGames: 1, ratedGames: 0, averageStarRating: null });
    });

    it('returns zeroed totals for an empty database', async () => {
        expect(await getCatalogSummary(db)).toEqual({ totalGames: 0, ratedGames: 0, averageStarRating: null });
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });
});
