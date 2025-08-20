import { Request, Response } from 'express';

import ReviewService from '@/services/reviewService';
import type { PullRequestWebhookEvent, PullRequestReviewWebhookEvent, IssueCommentWebhookEvent } from '@/types';
import config from '@/utils/config';
import logger from '@/utils/logger';

class WebhookController {
  private reviewService: ReviewService;

  constructor() {
    this.reviewService = new ReviewService();
  }

  async handlePullRequest(req: Request<{}, {}, PullRequestWebhookEvent>, res: Response): Promise<void> {
    try {
      const { action, number, pull_request, repository } = req.body;

      logger.info('Received PR webhook', {
        action,
        number,
        repo: repository?.full_name,
      });

      // Only process certain actions
      const reviewActions = ['opened', 'synchronize', 'reopened'];
      if (!reviewActions.includes(action)) {
        logger.info('Ignoring PR action', { action });
        return res.status(200).json({ message: 'Action ignored' });
      }

      // Only process PRs for configured repository
      // const owner = repository.owner.login;
      // const repo = repository.name;

      // if (owner !== config.GITHUB_OWNER || repo !== config.GITHUB_REPO) {
      //   logger.info('Ignoring PR from different repository', {
      //     owner,
      //     repo,
      //     configured: `${config.GITHUB_OWNER}/${config.GITHUB_REPO}`,
      //   });
      //   return res.status(200).json({ message: 'Repository not configured for review' });
      // }

      this.processReviewAsync(repository.owner.login, repository.name, number);
    } catch (error: any) {
      logger.error('Error handling PR webhook:', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async processReviewAsync(owner: string, repo: string, pullNumber: number): Promise<void> {
    try {
      logger.info('Starting async PR review', { owner, repo, pullNumber });

      const result = await this.reviewService.reviewPullRequest(owner, repo, pullNumber);

      logger.info('Async PR review completed', {
        owner,
        repo,
        pullNumber,
        status: result.status,
      });
    } catch (error: any) {
      logger.error('Error in async PR review:', {
        error: error.message,
        stack: error.stack,
        owner,
        repo,
        pullNumber,
      });
    }
  }

  async handlePullRequestReview(req: Request<{}, {}, PullRequestReviewWebhookEvent>, res: Response): Promise<void> {
    try {
      const { action, review, pull_request, repository } = req.body;

      logger.info('Received PR review webhook', {
        action,
        reviewState: review?.state,
        prNumber: pull_request?.number,
        repo: repository?.full_name,
      });

      // For now, we'll just log review events
      // Could be extended to update Linear issues based on review outcomes

      res.status(200).json({ message: 'Review webhook received' });
    } catch (error: any) {
      logger.error('Error handling PR review webhook:', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async handleIssueComment(req: Request<{}, {}, IssueCommentWebhookEvent>, res: Response): Promise<void> {
    try {
      const { action, comment, issue, repository } = req.body;

      // Only process if it's a PR comment (issues and PRs share the same endpoint)
      if (!issue.pull_request) {
        res.status(200).json({ message: 'Not a PR comment' });
        return;
      }

      logger.info('Received issue comment webhook', {
        action,
        commentId: comment?.id,
        issueNumber: issue?.number,
        repo: repository?.full_name,
      });

      // Could be extended to handle commands in comments (e.g., "/review", "/security-check")

      res.status(200).json({ message: 'Comment webhook received' });
    } catch (error: any) {
      logger.error('Error handling issue comment webhook:', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.NODE_ENV,
      };

      res.status(200).json(health);
    } catch (error: any) {
      logger.error('Health check error:', { error: error.message });
      res.status(500).json({ status: 'unhealthy', error: error.message });
    }
  }
}

export default WebhookController;

