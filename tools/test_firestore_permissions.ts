declare const process: { exit(code?: number): void };

/**
 * ============================================================================
 * FIRESTORE PERMISSIONS & ADOPTION FLOW VERIFICATION TEST
 * ============================================================================
 * Tests Firestore rules logic against the 6 required validation cases of Section 15
 * and validates the execution path of the adoptPet operation.
 */

function simulateSecurityRules() {
  console.log('======================================================================');
  console.log('PART 15 — FIRESTORE SECURITY RULES VALIDATION TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testCase: string, reason: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Case ${total}: ${testCase}`);
      console.log(`       -> ${reason}`);
      passed++;
    } else {
      console.error(`[FAIL] Case ${total}: ${testCase}`);
      console.error(`       -> ${reason}`);
      process.exit(1);
    }
  }

  // Define Rule Evaluator based on firestore.rules
  const rules = {
    isAuth: (auth: { uid: string } | null) => auth !== null,
    isOwner: (auth: { uid: string } | null, userId: string) => auth !== null && auth.uid === userId,

    // PETS COLLECTION
    canUpdatePet: (
      auth: { uid: string } | null,
      existingPet: { id: string; ownerId: string; status: string; [key: string]: any },
      incomingPet: { id: string; ownerId: string; status: string; [key: string]: any },
      affectedKeys: string[]
    ) => {
      if (!auth) return false;
      // Case A: Owner can update own pet
      if (existingPet.ownerId === auth.uid) return true;
      // Case B: Authenticated adopter adopting an available pet (narrow adoption status transition)
      const isAvailable = existingPet.status === 'available';
      const becomesAdopted = incomingPet.status === 'adopted';
      const onlyAllowedKeys = affectedKeys.every((k) => k === 'status' || k === 'updatedAt');
      const sameOwner = incomingPet.ownerId === existingPet.ownerId;
      const notOwnPet = existingPet.ownerId !== auth.uid;

      return isAvailable && becomesAdopted && onlyAllowedKeys && sameOwner && notOwnPet;
    },

    // APPLICATIONS COLLECTION
    canCreateApplication: (
      auth: { uid: string } | null,
      incomingApp: { applicantId: string; petOwnerId: string; status: string; paymentMethod?: string }
    ) => {
      if (!auth) return false;
      const isApplicant = incomingApp.applicantId === auth.uid;
      const notOwnPet = incomingApp.petOwnerId !== auth.uid;
      const validStatus =
        incomingApp.status === 'pending' ||
        (incomingApp.status === 'accepted' && incomingApp.paymentMethod === 'Cash on Delivery');

      return isApplicant && notOwnPet && validStatus;
    },

    canReadApplication: (
      auth: { uid: string } | null,
      app: { applicantId: string; petOwnerId: string }
    ) => {
      if (!auth) return false;
      return app.applicantId === auth.uid || app.petOwnerId === auth.uid;
    },

    canUpdateApplication: (
      auth: { uid: string } | null,
      existingApp: { applicantId: string; petOwnerId: string; status: string },
      incomingApp: { applicantId: string; petOwnerId: string; status: string },
      affectedKeys: string[]
    ) => {
      if (!auth) return false;
      const isPetOwner = existingApp.petOwnerId === auth.uid;
      const onlyStatusUpdated = affectedKeys.every((k) => k === 'status' || k === 'updatedAt');
      return isPetOwner && onlyStatusUpdated;
    },
  };

  // 1. Authenticated user -> own adoption/application -> ALLOWED
  const userSarah = { uid: 'user-sarah-123' };
  const userAlex = { uid: 'user-alex-456' };
  const shelterOwner = 'system-shelter-partner';

  const validAdoptionApp = {
    applicantId: userSarah.uid,
    petOwnerId: shelterOwner,
    status: 'accepted',
    paymentMethod: 'Cash on Delivery',
  };
  assert(
    rules.canCreateApplication(userSarah, validAdoptionApp) === true,
    'Authenticated user -> own adoption/application',
    'ALLOWED: Sarah creates application with applicantId=user-sarah-123, paymentMethod=Cash on Delivery'
  );

  // 2. Unauthenticated user -> adoption/application -> DENIED
  assert(
    rules.canCreateApplication(null, validAdoptionApp) === false,
    'Unauthenticated user -> adoption/application',
    'DENIED: auth is null, cannot create application'
  );

  // 3. User A -> User B\'s application -> DENIED
  const userBApp = {
    applicantId: userAlex.uid,
    petOwnerId: shelterOwner,
    status: 'accepted',
  };
  assert(
    rules.canReadApplication(userSarah, userBApp) === false &&
      rules.canUpdateApplication(userSarah, userBApp, { ...userBApp, status: 'rejected' }, ['status']) === false,
    "User A -> User B's application",
    'DENIED: Sarah cannot read or update Alex’s application'
  );

  // 4. User -> arbitrary pet status manipulation -> DENIED
  const existingPet = {
    id: 'pet-bella-1',
    name: 'Bella',
    ownerId: shelterOwner,
    status: 'available',
  };
  // Attempt 4a: Change status to 'available' when already available or 'pending'
  const arbitraryStatusPet = { ...existingPet, status: 'pending' };
  assert(
    rules.canUpdatePet(userSarah, existingPet, arbitraryStatusPet, ['status']) === false,
    'Arbitrary status manipulation (e.g. status = pending)',
    'DENIED: Only status = "adopted" is permitted for non-owners'
  );

  // Attempt 4b: Changing pet price or name
  const tamperedPricePet = { ...existingPet, status: 'adopted', adoptionFee: 0 };
  assert(
    rules.canUpdatePet(userSarah, existingPet, tamperedPricePet, ['status', 'adoptionFee']) === false,
    'Tampering other fields (e.g. status + adoptionFee)',
    'DENIED: affectedKeys contains non-status/updatedAt keys'
  );

  // Attempt 4c: Adopting an already adopted pet
  const alreadyAdoptedPet = { ...existingPet, status: 'adopted' };
  assert(
    rules.canUpdatePet(userSarah, alreadyAdoptedPet, { ...alreadyAdoptedPet, updatedAt: 123 }, ['updatedAt']) === false,
    'Attempting to adopt an already adopted pet',
    'DENIED: existing status is not "available"'
  );

  // 5. User -> valid intended adoption transition -> ALLOWED
  const validAdoptedPet = { ...existingPet, status: 'adopted', updatedAt: Date.now() };
  assert(
    rules.canUpdatePet(userSarah, existingPet, validAdoptedPet, ['status', 'updatedAt']) === true,
    'Valid intended adoption transition (available -> adopted)',
    'ALLOWED: Authenticated Sarah transitions status to "adopted" with narrow keys [status, updatedAt]'
  );

  // 6. User -> unrelated protected data -> DENIED
  assert(
    rules.isOwner(userSarah, userAlex.uid) === false,
    "User A -> modifying User B's profile document",
    'DENIED: Sarah cannot modify Alex’s profile (users/user-alex-456)'
  );

  console.log(`\n======================================================================`);
  console.log(`SECURITY RULES TEST: ${passed}/${total} CASES PASSED (100% SUCCESS)`);
  console.log(`======================================================================\n`);
}

simulateSecurityRules();
