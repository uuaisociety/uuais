export function isLocalBuildFixtureEnabled(): boolean {
  return (
    process.env.UUAIS_LOCAL_BUILD_FIXTURE === '1' &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'dummy-project'
  );
}
