# Variables = the inputs of your infrastructure. Set them with terraform.tfvars or TF_VAR_xxx env vars.
variable "region" {
  description = "AWS region (eu-west-1 = Ireland, close to the Netherlands)"
  type        = string
  default     = "eu-west-1"
}

variable "instance_type" {
  description = "EC2 size. t3.small (2GB RAM) is enough for the app + Prometheus + Grafana"
  type        = string
  default     = "t3.small"
}

variable "ssh_public_key" {
  description = "Contents of your PUBLIC ssh key (~/.ssh/id_ed25519.pub)"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "Who may SSH in. Use your own IP like 203.0.113.7/32. Never leave 0.0.0.0/0 in real life!"
  type        = string
  default     = "0.0.0.0/0"
}

variable "ssh_private_key_path" {
  description = "Path of the private key; written into the Ansible inventory"
  type        = string
  default     = "~/.ssh/id_ed25519"
}
