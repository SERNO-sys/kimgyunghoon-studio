/**
 * AWIE V2 - The Recipe Registry.
 *
 * Stores RecipeBlueprints keyed by recipeId. Provides register, get, match,
 * and list operations.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data storage.
 */

import type { IndustryId } from '../industry-registry';
import type { RecipeBlueprint, RecipeId } from './types';

/** Thrown when a recipeId is registered twice. */
export class DuplicateRecipeError extends Error {
  constructor(recipeId: RecipeId) {
    super(`Recipe "${recipeId}" is already registered.`);
    this.name = 'DuplicateRecipeError';
  }
}

/** Thrown when a recipeId is not found. */
export class UnknownRecipeError extends Error {
  constructor(recipeId: RecipeId) {
    super(`Recipe "${recipeId}" is not registered.`);
    this.name = 'UnknownRecipeError';
  }
}

/**
 * The RecipeRegistry.
 *
 * Stores RecipeBlueprints keyed by recipeId. Provides register, get, match,
 * and list operations.
 */
export class RecipeRegistry {
  private readonly recipes = new Map<RecipeId, RecipeBlueprint>();

  /** Registers a recipe. Throws DuplicateRecipeError if already present. */
  register(recipe: RecipeBlueprint): void {
    if (this.recipes.has(recipe.recipeId)) {
      throw new DuplicateRecipeError(recipe.recipeId);
    }
    this.recipes.set(recipe.recipeId, recipe);
  }

  /** Returns the recipe for a recipeId, or undefined. */
  get(recipeId: RecipeId): RecipeBlueprint | undefined {
    return this.recipes.get(recipeId);
  }

  /** Returns all recipes that support the given industry. */
  match(industryId: IndustryId): RecipeBlueprint[] {
    return this.list().filter((recipe) =>
      recipe.supportedIndustries.includes(industryId),
    );
  }

  /** Returns all registered recipes. */
  list(): RecipeBlueprint[] {
    return Array.from(this.recipes.values());
  }

  /** Returns the number of registered recipes. */
  get size(): number {
    return this.recipes.size;
  }
}
