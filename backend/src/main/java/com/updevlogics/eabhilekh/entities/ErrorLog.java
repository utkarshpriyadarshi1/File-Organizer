package com.updevlogics.eabhilekh.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "error_logs")
@Getter
@Setter
public class ErrorLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String service;
    private String message;
    private LocalDateTime timestamp;

    public ErrorLog() {
    }

    public ErrorLog(String service, String message) {
        this.service = service;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }

    // Getters and setters
}
