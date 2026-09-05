import type { Facility, Interest, InterestDraft, Resident } from '@/types/domain';
/** Matching should not depend on whether fixtures or Supabase supplied its data. */
export interface CommunityRepository {
  listResidents(): Promise<Resident[]>;
  listFacilities(): Promise<Facility[]>;
  recordInterest(interest: InterestDraft): Promise<Interest>;
}
