import { Injectable, Logger } from '@nestjs/common';
import { Repository, RepositoryFile } from './interfaces/connector.interface';
import { Octokit } from '@octokit/rest';

/**
 * GitHub Connector for interacting with the GitHub API
 */

// Code file extensions
const CODE_EXTENSIONS = new Set([
  '.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.c', '.cpp', '.h', '.hpp',
  '.cs', '.go', '.rb', '.php', '.swift', '.kt', '.scala', '.rs', '.m',
  '.sh', '.bash', '.ps1', '.lua', '.pl', '.pm', '.r', '.dart', '.sql',
]);

// Documentation file extensions
const DOC_EXTENSIONS = new Set([
  '.md', '.txt', '.rst', '.adoc', '.html', '.htm', '.xml',
  '.json', '.yaml', '.yml', '.toml',
]);

// Maximum file size (1MB)
const MAX_FILE_SIZE = 1 * 1024 * 1024;

// Directories to skip
const SKIPPED_DIRS = new Set([
  '.git', 'node_modules', 'vendor', 'build', 'dist', 'target',
  '__pycache__', 'venv', '.venv', 'env', '.vscode', '.idea',
  '.project', '.settings', 'tmp', 'logs',
]);

@Injectable()
export class GitHubConnector {
  private readonly logger = new Logger(GitHubConnector.name);
  private octokit: Octokit;

  constructor(token: string) {
    if (!token) {
      throw new ValueError('GitHub token cannot be empty.');
    }

    this.octokit = new Octokit({ auth: token });
    this.validateToken().catch((error) => {
      this.logger.error(`GitHub authentication failed: ${error.message}`);
      throw new Error('Invalid GitHub token or insufficient permissions.');
    });
    
    this.logger.log('GitHub connector initialized');
  }

  private async validateToken(): Promise<void> {
    try {
      await this.octokit.users.getAuthenticated();
      this.logger.log('Successfully authenticated with GitHub API');
    } catch (error) {
      this.logger.error(`GitHub authentication failed: ${error.message}`);
      throw new Error('Invalid GitHub token or insufficient permissions.');
    }
  }

  /**
   * Fetch repositories accessible by the authenticated user
   */
  async getUserRepositories(): Promise<Repository[]> {
    this.logger.log('Fetching user repositories');
    
    const repos: Repository[] = [];
    try {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        type: 'all',
        sort: 'updated',
        per_page: 100,
      });
      
      for (const repo of data) {
        repos.push({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
          url: repo.html_url,
          description: repo.description || '',
          last_updated: repo.updated_at ? new Date(repo.updated_at) : null,
        });
      }
      
      this.logger.log(`Fetched ${repos.length} repositories`);
      return repos;
    } catch (error) {
      this.logger.error(`Failed to fetch GitHub repositories: ${error.message}`);
      return [];
    }
  }

  /**
   * Recursively fetch relevant files from a repository
   */
  async getRepositoryFiles(
    repoFullName: string,
    path: string = '',
  ): Promise<RepositoryFile[]> {
    const filesList: RepositoryFile[] = [];
    
    try {
      const [owner, repo] = repoFullName.split('/');
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });
      
      const contents = Array.isArray(data) ? data : [data];
      
      for (const item of contents) {
        if (item.type === 'dir') {
          if (SKIPPED_DIRS.has(item.name)) {
            this.logger.debug(`Skipping directory: ${item.path}`);
            continue;
          }
          
          const subFiles = await this.getRepositoryFiles(repoFullName, item.path);
          filesList.push(...subFiles);
        } else if (item.type === 'file') {
          const extension = item.name.includes('.')
            ? '.' + item.name.split('.').pop()?.toLowerCase()
            : '';
          
          const isCode = CODE_EXTENSIONS.has(extension);
          const isDoc = DOC_EXTENSIONS.has(extension);
          
          if ((isCode || isDoc) && item.size <= MAX_FILE_SIZE) {
            filesList.push({
              path: item.path,
              sha: item.sha,
              url: item.html_url,
              size: item.size,
              type: isCode ? 'code' : 'doc',
            });
          } else if (item.size > MAX_FILE_SIZE) {
            this.logger.debug(`Skipping large file: ${item.path} (${item.size} bytes)`);
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Cannot access path '${path}' in '${repoFullName}': ${error.message}`);
    }
    
    return filesList;
  }

  /**
   * Fetch the decoded content of a specific file
   */
  async getFileContent(repoFullName: string, filePath: string): Promise<string | null> {
    try {
      const [owner, repo] = repoFullName.split('/');
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
      });
      
      if ('content' in data && data.type === 'file') {
        if (data.size > MAX_FILE_SIZE) {
          this.logger.warn(
            `File '${filePath}' exceeds max size (${data.size} > ${MAX_FILE_SIZE}). Skipping.`
          );
          return null;
        }
        
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return content;
      }
      
      return null;
    } catch (error) {
      this.logger.warn(`Cannot access file '${filePath}' in '${repoFullName}': ${error.message}`);
      return null;
    }
  }
}

// Custom error class
class ValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValueError';
  }
}

