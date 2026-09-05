import residentsJson from './residents.json';
import facilitiesJson from './facilities.json';
import { residentSchema, facilitySchema } from '@/lib/validation/community';

// Validate fixtures too: keyless and database modes should expose the same contract.
export const residents = residentsJson.map(value => residentSchema.parse(value));
export const facilities = facilitiesJson.map(value => facilitySchema.parse(value));
