# TERRAFORM CONCEPT: pin versions so everybody (and CI) gets the same behaviour.
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }

  # REMOTE STATE (uncomment for real teams): state file says what Terraform has built.
  # Keeping it in S3 + a DynamoDB lock lets a team share it safely.
  # backend "s3" {
  #   bucket         = "my-tf-state-bucket"
  #   key            = "belastingbuddy/terraform.tfstate"
  #   region         = "eu-west-1"
  #   dynamodb_table = "tf-locks"
  # }
}

provider "aws" {
  region = var.region

  # Tags added to EVERY resource automatically (cost tracking, ownership)
  default_tags {
    tags = {
      Project   = "belastingbuddy"
      ManagedBy = "terraform"
    }
  }
}
