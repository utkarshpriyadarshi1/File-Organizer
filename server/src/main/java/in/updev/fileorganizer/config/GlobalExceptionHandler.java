package in.updev.fileorganizer.config;

import in.updev.fileorganizer.entities.ErrorLog;
import in.updev.fileorganizer.repositories.ErrorLogRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.io.PrintWriter;
import java.io.StringWriter;

@ControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final ErrorLogRepository errorLogRepository;

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleAllExceptions(Exception ex) {
        logger.error("Unhandled API Exception", ex);
        
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        ex.printStackTrace(pw);
        
        ErrorLog errorLog = new ErrorLog("BACKEND_API", ex.getMessage() + "\n" + sw.toString());
        errorLogRepository.save(errorLog);
        
        return new ResponseEntity<>("An internal error occurred. It has been logged.", HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
