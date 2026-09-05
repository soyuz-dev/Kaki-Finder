import { facilities, residents } from '@/data';
import type { CommunityRepository } from './types';
import { RepositoryError } from './errors';

export function createFixtureRepository(): CommunityRepository {
  return {
    async listResidents() { return structuredClone(residents); },
    async listFacilities() { return structuredClone(facilities); },
    async recordInterest() {
      // Serverless memory is not durable. The guest UI will save fixture choices locally.
      throw new RepositoryError('LOCAL_STORAGE_REQUIRED', 'Demo interest must be saved in this browser.');
    },
  };
}
