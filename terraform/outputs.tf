# Outputs = values printed after `terraform apply`
output "public_ip" {
  description = "Server IP"
  value       = aws_instance.app.public_ip
}

output "app_url" {
  value = "http://${aws_instance.app.public_ip}:8080"
}

output "grafana_url" {
  value = "http://${aws_instance.app.public_ip}:3000"
}
