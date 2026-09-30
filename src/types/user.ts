export interface UserDto {
  email: string | null;
  profileImageUrl: string | null;
  username: string;
  phoneNumber: string | null;
}

export interface UserProfileUpdate {
  username: string;
  phoneNumber: string | null;
}
