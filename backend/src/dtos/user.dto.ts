/**
 * User DTOs
 */

import { IsEmail, IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UserDto {
  @IsUUID()
  id: string;

  @IsEmail()
  email: string;

  @IsBoolean()
  isActive: boolean;

  @IsBoolean()
  isSuperuser: boolean;

  @IsBoolean()
  isVerified: boolean;
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isSuperuser?: boolean;

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;
}

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isSuperuser?: boolean;

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;
}
