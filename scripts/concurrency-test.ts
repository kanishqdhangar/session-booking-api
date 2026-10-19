
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const REQUEST_COUNT = 20;
const COMPLETION_REQUEST_COUNT = 10;

interface ApiResponse {
  status: number;
  body: unknown;
}

const request = async (
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<ApiResponse> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const responseBody: unknown = await response.json();
  return { status: response.status, body: responseBody };
};

const requireSuccess = (
  condition: boolean,
  message: string,
): void => {
  if (!condition) throw new Error(message);
};

const countStatuses = (
  results: ApiResponse[],
): Map<number, number> => {
  const counts = new Map<number, number>();
  for (const result of results) {
    counts.set(result.status, (counts.get(result.status) ?? 0) + 1);
  }
  return counts;
};

const printStatuses = (
  label: string,
  results: ApiResponse[],
): void => {
  console.log(`\n${label}`);
  for (const [status, count] of countStatuses(results)) {
    console.log(`HTTP ${status}: ${count}`);
  }
};

const main = async (): Promise<void> => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const teacherResponse = await request('/teachers', 'POST', {
    fullName: 'Concurrency Test Teacher',
    email: `concurrency-teacher-${unique}@example.com`,
    specialization: 'Backend Engineering',
    experience: 5,
  });

  requireSuccess(
    teacherResponse.status === 201,
    `Teacher creation failed: HTTP ${teacherResponse.status}`,
  );

  const teacherBody = teacherResponse.body as {
    data?: { _id?: string };
  };
  const teacherId = teacherBody.data?._id;

  requireSuccess(typeof teacherId === 'string', 'Teacher ID missing');

  const userResponses = await Promise.all(
    Array.from({ length: REQUEST_COUNT }, (_, index) =>
      request('/users', 'POST', {
        fullName: `Concurrency User ${index + 1}`,
        email: `concurrency-user-${unique}-${index}@example.com`,
        phone: `+1555${String(index).padStart(7, '0')}`,
      }),
    ),
  );

  requireSuccess(
    userResponses.every((response) => response.status === 201),
    'One or more test users could not be created',
  );

  const userIds = userResponses.map((response) => {
    const body = response.body as { data?: { _id?: string } };
    return body.data?._id;
  });

  requireSuccess(
    userIds.every((id): id is string => typeof id === 'string'),
    'One or more user IDs are missing',
  );

  const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  startTime.setUTCMinutes(0, 0, 0);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

  const sessionResponse = await request('/sessions', 'POST', {
    teacherId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  });

  requireSuccess(
    sessionResponse.status === 201,
    `Session creation failed: HTTP ${sessionResponse.status}`,
  );

  const sessionBody = sessionResponse.body as {
    data?: { _id?: string };
  };
  const sessionId = sessionBody.data?._id;

  requireSuccess(typeof sessionId === 'string', 'Session ID missing');

  const bookingResults = await Promise.all(
    userIds.map((userId) =>
      request(`/sessions/${sessionId}/book`, 'POST', { userId }),
    ),
  );

  printStatuses('Concurrent booking results', bookingResults);

  const bookingCounts = countStatuses(bookingResults);
  requireSuccess(
    bookingCounts.get(200) === 1 && bookingCounts.get(409) === REQUEST_COUNT - 1,
    'Booking concurrency check failed',
  );

  const sessionLists = await Promise.all(
    userIds.map((userId) => request(`/users/${userId}/sessions`)),
  );

  const usersWithSession = sessionLists.filter((response) => {
    const body = response.body as {
      data?: { upcomingSessions?: Array<{ _id?: string }> };
    };
    return body.data?.upcomingSessions?.some(
      (session) => session._id === sessionId,
    );
  }).length;

  requireSuccess(
    usersWithSession === 1,
    `Expected exactly one user to own the booking; found ${usersWithSession}`,
  );

  const completionResults = await Promise.all(
    Array.from({ length: COMPLETION_REQUEST_COUNT }, () =>
      request(`/sessions/${sessionId}/complete`, 'PATCH'),
    ),
  );

  printStatuses('Concurrent completion results', completionResults);

  const completionCounts = countStatuses(completionResults);
  requireSuccess(
    completionCounts.get(200) === 1 &&
      completionCounts.get(409) === COMPLETION_REQUEST_COUNT - 1,
    'Completion concurrency check failed',
  );

  console.log('\nPASS: atomic booking and completion checks succeeded.');
};

main().catch((error: unknown) => {
  console.error('\nFAIL:', error);
  process.exitCode = 1;
});
