const context = require('gitter-web-client-context');
import slugger from '../../../utils/slugger';

import { slugAvailabilityStatusConstants } from '../constants';

// eslint-disable-next-line complexity
export default function validateCommunitySlug(
  communitySlug,
  selectedBackingEntity,
  slugAvailabilityStatus
) {
  let communitySlugError;
  const hasCommunitySlug = communitySlug.length > 0;
  const slugValid = slugger.isValid(communitySlug);

  if (!hasCommunitySlug) {
    communitySlugError = 'Please fill in the community slug';
  } else if (communitySlug.length < 2 || communitySlug.length > 80) {
    communitySlugError = 'Slug length must be 2 to 80 characters';
  } else if (!slugValid || slugAvailabilityStatus === slugAvailabilityStatusConstants.INVALID) {
    communitySlugError = 'Slug contains invalid characters';
  } else if (slugAvailabilityStatus === slugAvailabilityStatusConstants.AUTHENTICATION_FAILED) {
    communitySlugError =
      'Authentication Failed. It is probably a GitHub app scope mismatch between public/private on your own user and the org';
  } else if (slugAvailabilityStatus === slugAvailabilityStatusConstants.GITHUB_CLASH) {
    // If you select the `foo/bar` repo, it fills in the community URI as `bar` and then tells you don't have proper permissions for `bar` because the `bar` org already exists on GitHub.
    if (selectedBackingEntity && selectedBackingEntity.type === 'GH_REPO') {
      const repoName = selectedBackingEntity.uri.split('/').pop();
      communitySlugError = `The name of the GitHub repo you selected conflicts with the name of a GitHub org/user. When you select the a repo "${selectedBackingEntity.uri}", it fills out the community URI as "${repoName}" which clashes another GitHub org/user. Change your community URI to proceed.`;
    }
    // If they are a GitHub user, they just need more permissions to resolve the clash (#github-uri-split)
    else if (context.hasProvider('github')) {
      communitySlugError = `There is a URI clash with an org/repo/user on GitHub. Change your community URI to proceed or if you in control of this org/repo, allow private repo access on the GitHub org or make your org membership public. We are currently not allowed to see that you control the GitHub org/repo`;
    } else {
      // If they aren't a GitHub user, there is no way they can create something with the same GitHub URI
      communitySlugError =
        'There is a URI clash with an org/repo/user on GitHub. Change your community URI to proceed.';
    }
  } else if (slugAvailabilityStatus === slugAvailabilityStatusConstants.UNAVAILABLE) {
    communitySlugError = 'This address is not available. It already exists on Gitter';
  } else if (slugAvailabilityStatus === slugAvailabilityStatusConstants.PENDING) {
    communitySlugError = 'Checking availability';
  }

  return communitySlugError;
}
