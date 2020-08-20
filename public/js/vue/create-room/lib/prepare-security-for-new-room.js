export default function prepareSecurityForNewRoom(selectedRepo, allowGroupAdmins, roomSecurity) {
  if (selectedRepo) {
    return {
      type: selectedRepo.type,
      linkPath: selectedRepo.uri,
      security: roomSecurity
    };
  } else if (allowGroupAdmins && roomSecurity === 'PRIVATE') {
    return {
      type: 'GROUP',
      linkPath: null,
      // Re-defining `security` sucks but is the only way to get `INVITE_OR_ADMIN` members
      // See https://github.com/troupe/gitter-webapp/pull/2224#discussion_r79404352
      security: 'INHERITED'
    };
  } else if (roomSecurity === 'PUBLIC') {
    return {
      type: 'GROUP',
      linkPath: null,
      security: 'PUBLIC'
    };
  }

  return {
    // null is valid type we use for private rooms
    type: null,
    linkPath: null,
    security: roomSecurity
  };
}
