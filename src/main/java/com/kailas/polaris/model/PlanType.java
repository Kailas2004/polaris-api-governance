package com.kailas.polaris.model;

public enum PlanType {
    FREE,
    PRO;

    public int defaultLimit() {
        return switch (this) {
            case FREE -> 100;
            case PRO -> 1000;
        };
    }
}
