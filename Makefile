# Stellar LumenMint — root task runner
#
# Thin aliases over the per-workspace commands documented in CONTRIBUTING.md.
# Each target shells into the workspace it affects so node_modules layouts and
# per-workspace tooling stay authoritative.

SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help install infra dev backend frontend admin mobile \
	typecheck test test-backend test-frontend test-admin test-mobile \
	lint format contracts-build contracts-test clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies for every JavaScript workspace
	cd backend && npm ci
	cd frontend && npm ci
	cd admin && npm ci --legacy-peer-deps
	cd mobile-app && npm ci
	cd packages && npm install

infra: ## Start PostgreSQL, Redis and Meilisearch
	cd backend && docker-compose up -d

dev: ## Run the backend and frontend dev servers
	cd backend && npm run start:dev & \
	cd frontend && npm run dev & \
	wait

backend: ## Start the backend API (http://localhost:3000)
	cd backend && npm run start:dev

frontend: ## Start the marketplace (http://localhost:5000)
	cd frontend && npm run dev

admin: ## Start the admin dashboard
	cd admin && npm run dev

mobile: ## Start the Expo dev server
	cd mobile-app && npm start

typecheck: ## Type-check every JavaScript workspace
	cd backend && npx tsc --noEmit
	cd frontend && npx tsc --noEmit
	cd admin && npx tsc --noEmit

test: test-backend test-frontend test-admin test-mobile ## Run all workspace test suites

test-backend: ## Run backend tests
	cd backend && npm test

test-frontend: ## Run frontend tests
	cd frontend && npm test

test-admin: ## Run admin tests
	cd admin && npm test

test-mobile: ## Run mobile app tests
	cd mobile-app && npm test

lint: ## Lint backend and frontend
	cd backend && npx eslint "{src,test}/**/*.ts"
	cd frontend && npx eslint .

format: ## Check formatting in the backend
	cd backend && npx prettier --check "src/**/*.ts" "test/**/*.ts"

contracts-build: ## Build the Soroban contracts
	cd soroban && cargo build --workspace --release

contracts-test: ## Test the Soroban contracts
	cd soroban && cargo test --workspace

clean: ## Remove build output from every workspace
	rm -rf backend/dist frontend/.next admin/dist soroban/target
