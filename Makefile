.PHONY: help dev dev-build dev-d prod prod-build down down-v logs ps redis-cli sh exec run

help:
	@echo "Backend Docker Commands:"
	@echo "  make dev         - Start backend & Redis in development mode (hot-reloading)"
	@echo "  make dev-build   - Rebuild and start development container"
	@echo "  make dev-d       - Start development container in background"
	@echo "  make prod        - Start backend & Redis in production mode"
	@echo "  make prod-build  - Rebuild and start production container"
	@echo "  make down        - Stop backend and redis containers"
	@echo "  make down-v      - Stop and remove volumes"
	@echo "  make logs        - Follow backend logs"
	@echo "  make ps          - List running backend containers"
	@echo "  make sh          - Open interactive shell inside backend container"
	@echo "  make exec CMD=\"..\" - Execute a command inside the running backend container"
	@echo "  make run CMD=\"..\"  - Run a one-off command without starting dependencies"
	@echo "  make redis-cli   - Open interactive Redis CLI"

dev:
	docker compose --profile dev up

dev-build:
	docker compose --profile dev up --build

dev-d:
	docker compose --profile dev up -d

prod:
	docker compose --profile prod up -d

prod-build:
	docker compose --profile prod up --build -d

down:
	docker compose --profile dev --profile prod down

down-v:
	docker compose --profile dev --profile prod down -v

logs:
	docker compose --profile dev --profile prod logs -f

ps:
	docker compose --profile dev --profile prod ps

# Shell inside running container
sh:
	docker exec -it aib-backend-dev sh

# Execute a command in running backend container (e.g., make exec CMD="pnpm approve-builds")
exec:
	docker exec -it aib-backend-dev $(CMD)

# Run a one-off command in a temporary container without starting dependent service containers
run:
	docker compose --profile dev run --no-deps --rm backend-dev $(CMD)

redis-cli:
	docker exec -it aib-redis redis-cli
