#!/bin/bash

# =============================================================================
# NestJS Backend Template - Remote Installation Script
# =============================================================================
# Install with: curl -fsSL https://raw.githubusercontent.com/KingNNT/backend-nestjs-application/develop/install.sh | bash
# Or: curl -fsSL https://raw.githubusercontent.com/KingNNT/backend-nestjs-application/develop/install.sh | bash -s my-project
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
REPO_URL="https://github.com/KingNNT/backend-nestjs-application.git"
TEMPLATE_NAME="backend-nestjs-application"
TEMPLATE_DB_NAME="inviduality_dev"

# -----------------------------------------------------------------------------
# Colors and Formatting
# -----------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}  NestJS Backend Template Installer${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Cross-platform sed in-place edit
sed_inplace() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "$@"
    else
        sed -i "$@"
    fi
}

# Convert kebab-case to snake_case
to_snake_case() {
    echo "$1" | tr '-' '_'
}

# Validate project name (kebab-case, alphanumeric with hyphens)
validate_project_name() {
    if [[ ! "$1" =~ ^[a-z][a-z0-9-]*[a-z0-9]$ ]] && [[ ! "$1" =~ ^[a-z][a-z0-9]*$ ]]; then
        return 1
    fi
    return 0
}

# Validate email format
validate_email() {
    if [[ ! "$1" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
        return 1
    fi
    return 0
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# -----------------------------------------------------------------------------
# Main Installation Logic
# -----------------------------------------------------------------------------
main() {
    print_header

    # -------------------------------------------------------------------------
    # Check Prerequisites
    # -------------------------------------------------------------------------
    print_info "Checking prerequisites..."

    if ! command_exists git; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    print_success "Git is installed"

    if ! command_exists bun; then
        print_error "Bun is not installed. Please install Bun first: https://bun.sh/"
        exit 1
    fi
    print_success "Bun is installed"

    if ! command_exists docker; then
        print_warning "Docker is not installed. You'll need it to run the project."
    else
        print_success "Docker is installed"
    fi

    echo ""

    # -------------------------------------------------------------------------
    # Collect User Input
    # -------------------------------------------------------------------------
    echo -e "${BOLD}${YELLOW}Step 1: Project Configuration${NC}"
    echo ""

    # Check if project name was passed as argument
    if [[ -n "$1" ]]; then
        PROJECT_NAME="$1"
        if ! validate_project_name "$PROJECT_NAME"; then
            print_error "Invalid project name: $PROJECT_NAME"
            print_error "Must be lowercase, start with a letter, use only letters, numbers, and hyphens"
            exit 1
        fi
        print_info "Using project name from argument: $PROJECT_NAME"
    else
        # Interactive prompt for project name
        while true; do
            read -p "$(echo -e "${CYAN}Enter project name ${NC}${BOLD}[kebab-case, e.g., my-awesome-api]${NC}: ")" PROJECT_NAME
            if [[ -z "$PROJECT_NAME" ]]; then
                print_error "Project name cannot be empty"
            elif ! validate_project_name "$PROJECT_NAME"; then
                print_error "Project name must be lowercase, start with a letter, use only letters, numbers, and hyphens"
            elif [[ -d "$PROJECT_NAME" ]]; then
                print_error "Directory '$PROJECT_NAME' already exists"
            else
                break
            fi
        done
    fi

    # Check if directory exists
    if [[ -d "$PROJECT_NAME" ]]; then
        print_error "Directory '$PROJECT_NAME' already exists. Please choose a different name or remove the directory."
        exit 1
    fi

    # Project description
    while true; do
        read -p "$(echo -e "${CYAN}Enter project description${NC}: ")" PROJECT_DESCRIPTION
        if [[ -z "$PROJECT_DESCRIPTION" ]]; then
            print_error "Project description cannot be empty"
        else
            break
        fi
    done

    echo ""
    echo -e "${BOLD}${YELLOW}Step 2: Author Information${NC}"
    echo ""

    # Author name
    while true; do
        read -p "$(echo -e "${CYAN}Enter author name${NC}: ")" AUTHOR_NAME
        if [[ -z "$AUTHOR_NAME" ]]; then
            print_error "Author name cannot be empty"
        else
            break
        fi
    done

    # Author email
    while true; do
        read -p "$(echo -e "${CYAN}Enter author email${NC}: ")" AUTHOR_EMAIL
        if [[ -z "$AUTHOR_EMAIL" ]]; then
            print_error "Author email cannot be empty"
        elif ! validate_email "$AUTHOR_EMAIL"; then
            print_error "Please enter a valid email address"
        else
            break
        fi
    done

    # -------------------------------------------------------------------------
    # Derive Values
    # -------------------------------------------------------------------------
    PROJECT_NAME_SNAKE=$(to_snake_case "$PROJECT_NAME")
    DB_NAME="${PROJECT_NAME_SNAKE}_dev"

    # -------------------------------------------------------------------------
    # Confirmation
    # -------------------------------------------------------------------------
    echo ""
    echo -e "${BOLD}${YELLOW}Step 3: Confirmation${NC}"
    echo ""
    echo -e "  ${BOLD}Project name:${NC}         $PROJECT_NAME"
    echo -e "  ${BOLD}Description:${NC}          $PROJECT_DESCRIPTION"
    echo -e "  ${BOLD}Author:${NC}               $AUTHOR_NAME <$AUTHOR_EMAIL>"
    echo -e "  ${BOLD}Database:${NC}             $DB_NAME"
    echo -e "  ${BOLD}Directory:${NC}            ./$PROJECT_NAME"
    echo ""

    read -p "$(echo -e "${YELLOW}Proceed with installation? [Y/n]${NC} ")" CONFIRM
    CONFIRM=${CONFIRM:-Y}
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        print_warning "Installation cancelled"
        exit 0
    fi

    # -------------------------------------------------------------------------
    # Clone Repository
    # -------------------------------------------------------------------------
    echo ""
    echo -e "${BOLD}${YELLOW}Step 4: Cloning Template${NC}"
    echo ""

    print_info "Cloning repository..."
    git clone --depth 1 --branch develop "$REPO_URL" "$PROJECT_NAME" 2>/dev/null
    print_success "Cloned to ./$PROJECT_NAME"

    cd "$PROJECT_NAME"

    # -------------------------------------------------------------------------
    # Update Files
    # -------------------------------------------------------------------------
    echo ""
    echo -e "${BOLD}${YELLOW}Step 5: Customizing Project${NC}"
    echo ""

    # package.json
    print_info "Updating package.json..."
    sed_inplace "s/\"name\": \"$TEMPLATE_NAME\"/\"name\": \"$PROJECT_NAME\"/" package.json
    sed_inplace "s/\"description\": \"\"/\"description\": \"$PROJECT_DESCRIPTION\"/" package.json
    sed_inplace "s/\"author\": \"\"/\"author\": \"$AUTHOR_NAME <$AUTHOR_EMAIL>\"/" package.json
    print_success "Updated package.json"

    # docker-compose.yml
    print_info "Updating docker-compose.yml..."
    sed_inplace "s/name: $TEMPLATE_NAME/name: $PROJECT_NAME/" docker-compose.yml
    sed_inplace "s/$TEMPLATE_DB_NAME/$DB_NAME/g" docker-compose.yml
    print_success "Updated docker-compose.yml"

    # .env.example
    if [[ -f ".env.example" ]]; then
        print_info "Updating .env.example..."
        sed_inplace "s/$TEMPLATE_DB_NAME/$DB_NAME/g" .env.example
        print_success "Updated .env.example"
    fi

    # -------------------------------------------------------------------------
    # Cleanup
    # -------------------------------------------------------------------------
    echo ""
    echo -e "${BOLD}${YELLOW}Step 6: Cleanup${NC}"
    echo ""

    # Remove template git history
    print_info "Removing template git history..."
    rm -rf .git
    print_success "Removed .git directory"

    # Remove install script
    print_info "Removing install script..."
    rm -f install.sh
    print_success "Removed install.sh"

    # Install dependencies
    print_info "Installing dependencies..."
    bun install
    print_success "Installed dependencies"

    # Copy .env.example to .env
    if [[ -f ".env.example" ]]; then
        print_info "Creating .env from .env.example..."
        cp .env.example .env
        print_success "Created .env"
    fi

    # Initialize new git repository
    print_info "Initializing new git repository..."
    git init -q
    git add .
    git commit -q -m "chore: initial commit from NestJS template"
    print_success "Initialized git repository with initial commit"

    # -------------------------------------------------------------------------
    # Success Message
    # -------------------------------------------------------------------------
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${GREEN}  Installation Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BOLD}Your project is ready at:${NC} ${CYAN}./$PROJECT_NAME${NC}"
    echo ""
    echo -e "${BOLD}Next steps:${NC}"
    echo ""
    echo -e "  1. Navigate to your project:"
    echo -e "     ${CYAN}cd $PROJECT_NAME${NC}"
    echo ""
    echo -e "  2. Start infrastructure (PostgreSQL + EventStoreDB):"
    echo -e "     ${CYAN}docker compose up -d${NC}"
    echo ""
    echo -e "  3. Set up the database:"
    echo -e "     ${CYAN}bunx prisma generate && bunx prisma db push${NC}"
    echo ""
    echo -e "  4. Start development server:"
    echo -e "     ${CYAN}bun run start:dev${NC}"
    echo ""
    echo -e "  5. Access your API:"
    echo -e "     ${CYAN}http://localhost:3000/docs${NC} - Swagger UI"
    echo ""
    echo -e "  6. Run tests:"
    echo -e "     ${CYAN}bun run test${NC}"
    echo ""
    echo -e "${BOLD}Happy coding!${NC}"
    echo ""
}

# Run main with stdin from /dev/tty if piped, otherwise run normally
# This MUST be at the very end so bash has read the entire script first
if [[ -n "$INSTALL_TESTING" ]]; then
    main "$@"
elif [[ ! -t 0 ]]; then
    main "$@" < /dev/tty
else
    main "$@"
fi
