import { roomAvailabilityStatusConstants } from '../constants';

export default function validateRoomName(roomName, roomAvailabilityStatus) {
  const hasRoomName = roomName.length > 0;
  if (!hasRoomName) {
    return 'Please fill in the room name.';
  } else if (roomAvailabilityStatus === roomAvailabilityStatusConstants.UNAVAILABLE) {
    return 'There is already a room with that name.';
  } else if (roomAvailabilityStatus === roomAvailabilityStatusConstants.VALIDATION_FAILED) {
    return 'Validation failed.';
  } else if (
    !/^[a-zA-Z0-9\-_\\.]+$/.test(roomName) ||
    roomAvailabilityStatus === roomAvailabilityStatusConstants.ILLEGAL_NAME
  ) {
    return 'Room names can only contain letters, numbers, and dashes.';
  } else if (roomAvailabilityStatus === roomAvailabilityStatusConstants.REPO_CONFLICT) {
    return 'In order to create a room with the same URI as a GitHub repo, you need to associate it with the room. You can setup the repo association with the dropdown just below. You may need to grant public/private repo scope on the GitHub org in order for us to see it.';
  } else if (roomAvailabilityStatus === roomAvailabilityStatusConstants.PENDING) {
    return 'Waiting for room name check to respond.';
  } else if (roomAvailabilityStatus === roomAvailabilityStatusConstants.INSUFFICIENT_PERMISSIONS) {
    return "You don't have sufficient permissions to create this room. Are you an admin?";
  }

  return null;
}
