export default function validateCommunityName(communityName) {
  const hasCommunityName = communityName.length > 0;
  let communityNameError;
  if (!hasCommunityName) {
    communityNameError = 'Please fill in the community name';
  } else if (!/^[^<>]{1,80}$/.test(communityName)) {
    communityNameError = 'Invalid community name';
  }

  return communityNameError;
}
