/**
 * Google Auth Credentials DTOs
 */

import { IsString, IsArray, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class GoogleAuthCredentialsDto {
  @IsString()
  token: string;

  @IsString()
  refreshToken: string;

  @IsString()
  tokenUri: string;

  @IsString()
  clientId: string;

  @IsDate()
  @Type(() => Date)
  expiry: Date;

  @IsArray()
  @IsString({ each: true })
  scopes: string[];

  @IsString()
  clientSecret: string;

  /**
   * Check if the credentials have expired
   */
  get expired(): boolean {
    return this.expiry <= new Date();
  }
}
