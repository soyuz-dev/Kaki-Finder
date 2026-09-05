import type { Facility, Interest, Resident } from '@/types/domain';
/** Matching should not depend on whether fixtures or Supabase supplied its data. */
export interface CommunityRepository {
  listResidents(): Promise<Resident[]>;
  listFacilities(): Promise<Facility[]>;
  recordInterest(interest: Omit<Interest, 'id' | 'createdAt'>): Promise<Interest>;
}
